package com.garment.service;

import com.garment.DTO.ProductRequest;
import com.garment.DTO.ProductResponse;
import com.garment.entity.Product;
import com.garment.repository.ProductRepository;
import com.garment.repository.ShadeRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ProductService {

    // ── Category / Sub-category master list ───────────────────────────────────
    private static final Map<String, List<String>> CATEGORY_MAP;
    static {
        CATEGORY_MAP = new LinkedHashMap<>();
        CATEGORY_MAP.put("MEN", List.of(
                "T-Shirt","Pouch Gents","Gents Sweet Shirt","Gents Pajama","Track Suit","Night Suit","Boys Suit"
        ));
        CATEGORY_MAP.put("WOMEN", List.of(
                "Ladies Pouch","Girly Pouch","Girlyish Tees","Ladies Sweet","Ladies Pajama","Girl Suit","Night Suit","Track Suit"
        ));
        CATEGORY_MAP.put("KIDS", List.of(
                "Kit T-Shirt","Kids Pouch","Kids Sweet Shirt","Kid Pajama","Boys Suit","Girl Suit","Track Suit","Night Suit"
        ));
    }

    private final ProductRepository repo;
    private final CloudinaryService cloudinaryService;
    private final ShadeRepository shadeRepository;

    public ProductService(ProductRepository repo,
                          CloudinaryService cloudinaryService,
                          ShadeRepository shadeRepository) {
        this.repo              = repo;
        this.cloudinaryService = cloudinaryService;
        this.shadeRepository   = shadeRepository;
    }

    // ── Shade resolver: shadeCode -> shadeName ────────────────────
    // Cached map built once per service call to avoid N+1 DB hits
    private java.util.function.Function<String, String> buildShadeResolver() {
        // Load all shades into a map once
        Map<String, String> shadeMap = shadeRepository.findAll()
                .stream()
                .collect(Collectors.toMap(
                        s -> s.getShadeCode(),
                        s -> s.getShadeName(),
                        (a, b) -> a
                ));
        // Return resolver: if code not found, return the code itself as fallback
        return code -> shadeMap.getOrDefault(code, code);
    }

    // ── CRUD ──────────────────────────────────────────────────────

    public ProductResponse createProduct(ProductRequest req) {
        validateCategoryAndSub(req.getCategories(), req.getSubCategory());
        Product p = new Product();
        mapToEntity(req, p);
        p.setCreatedAt(LocalDateTime.now());
        p.setActive(true);
        return ProductResponse.from(repo.save(p), buildShadeResolver());
    }

    public ProductResponse updateProduct(Long id, ProductRequest req) {
        validateCategoryAndSub(req.getCategories(), req.getSubCategory());
        Product p = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found: " + id));
        List<String> oldImages = parseList(p.getImages());
        List<String> newImages = req.getImages() != null ? req.getImages() : Collections.emptyList();
        oldImages.stream().filter(url -> !newImages.contains(url))
                .forEach(cloudinaryService::deleteImage);
        mapToEntity(req, p);
        p.setUpdatedAt(LocalDateTime.now());
        return ProductResponse.from(repo.save(p), buildShadeResolver());
    }

    public void deleteProduct(Long id) {
        Product p = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found: " + id));
        parseList(p.getImages()).forEach(cloudinaryService::deleteImage);
        repo.deleteById(id);
    }

    public List<ProductResponse> getAllProductsAdmin() {
        var resolver = buildShadeResolver();
        return repo.findAllByOrderByCreatedAtDesc().stream()
                .map(p -> ProductResponse.from(p, resolver))
                .collect(Collectors.toList());
    }

    public List<ProductResponse> getActiveProducts(String search) {
        var resolver = buildShadeResolver();
        List<Product> list = (search != null && !search.isBlank())
                ? repo.findByActiveTrueAndNameContainingIgnoreCaseOrderByCreatedAtDesc(search.trim())
                : repo.findByActiveTrueOrderByCreatedAtDesc();
        return list.stream()
                .map(p -> ProductResponse.from(p, resolver))
                .collect(Collectors.toList());
    }

    public ProductResponse getProductById(Long id) {
        return ProductResponse.from(
                repo.findById(id).orElseThrow(() -> new RuntimeException("Product not found: " + id)),
                buildShadeResolver()
        );
    }

    // ── Validation ────────────────────────────────────────────────
    private void validateCategoryAndSub(List<String> categories, String subCategory) {
        if (categories == null || categories.isEmpty())
            throw new RuntimeException("At least one category is required.");

        Set<String> allowedSubs = new LinkedHashSet<>();
        for (String cat : categories) {
            String key = cat.trim().toUpperCase();
            List<String> subs = CATEGORY_MAP.get(key);
            if (subs == null)
                throw new RuntimeException(
                    "Invalid category: '" + cat + "'. Allowed: " + CATEGORY_MAP.keySet());
            allowedSubs.addAll(subs);
        }

        if (subCategory == null || subCategory.isBlank())
            throw new RuntimeException("Sub-category is required.");

        boolean validSub = allowedSubs.stream()
                .anyMatch(s -> s.equalsIgnoreCase(subCategory.trim()));
        if (!validSub)
            throw new RuntimeException(
                "Invalid sub-category: '" + subCategory + "' for selected categories. Allowed: " + allowedSubs);
    }

    // ── Mapping ───────────────────────────────────────────────────
    private void mapToEntity(ProductRequest req, Product p) {
        p.setName(req.getName().trim());
        p.setDescription(req.getDescription() != null ? req.getDescription().trim() : "");

        String cats = req.getCategories().stream()
                .map(c -> c.trim().toUpperCase())
                .distinct()
                .collect(Collectors.joining(","));
        p.setCategories(cats);
        p.setSubCategory(req.getSubCategory().trim());

        p.setBoxQuantity(req.getBoxQuantity() != null ? req.getBoxQuantity() : 12);
        p.setSizes(req.getSizes()  != null ? String.join(",", req.getSizes())  : "");
        p.setImages(req.getImages() != null ? String.join(",", req.getImages()) : "");

        // Art fields
        p.setArtSerialNumber(req.getArtSerialNumber());
        p.setArtNo(req.getArtNo());
        p.setArtName(req.getArtName());

        // Shades: store as comma-separated shade codes
        if (req.getShades() != null && !req.getShades().isEmpty()) {
            String shadeCsv = req.getShades().stream()
                    .map(String::trim)
                    .filter(s -> !s.isBlank())
                    .distinct()
                    .collect(Collectors.joining(","));
            p.setShades(shadeCsv);
        } else {
            p.setShades("");
        }

        if (req.getPricing() != null) {
            p.setPriceWholeSeller(    orZero(req.getPricing().getWholeSeller()));
            p.setPriceSemiWholeSeller(orZero(req.getPricing().getSemiWholeSeller()));
            p.setPriceRetailer(       orZero(req.getPricing().getRetailer()));
        }

        if (req.getMinBox() != null) {
            p.setMinBoxWholeSeller(    orDefault(req.getMinBox().getWholeSeller(), 10));
            p.setMinBoxSemiWholeSeller(orDefault(req.getMinBox().getSemiWholeSeller(), 8));
            p.setMinBoxRetailer(       orDefault(req.getMinBox().getRetailer(), 5));
        }
    }

    private double orZero(Double v)              { return v != null ? v : 0.0; }
    private int    orDefault(Integer v, int def) { return (v != null && v > 0) ? v : def; }

    private List<String> parseList(String csv) {
        if (csv == null || csv.isBlank()) return new ArrayList<>();
        return Arrays.stream(csv.split(",")).map(String::trim)
                .filter(s -> !s.isBlank()).collect(Collectors.toList());
    }
}