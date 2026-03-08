package com.garment.service;

import com.garment.DTO.ProductRequest;
import com.garment.DTO.ProductResponse;
import com.garment.entity.Product;
import com.garment.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ProductService {

    private final ProductRepository repo;
    private final CloudinaryService cloudinaryService;

    public ProductService(ProductRepository repo, CloudinaryService cloudinaryService) {
        this.repo = repo;
        this.cloudinaryService = cloudinaryService;
    }

    public ProductResponse createProduct(ProductRequest req) {
        Product p = new Product();
        mapToEntity(req, p);
        p.setCreatedAt(LocalDateTime.now());
        p.setActive(true);
        return ProductResponse.from(repo.save(p));
    }

    public ProductResponse updateProduct(Long id, ProductRequest req) {
        Product p = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found: " + id));
        List<String> oldImages = parseList(p.getImages());
        List<String> newImages = req.getImages() != null ? req.getImages() : Collections.emptyList();
        oldImages.stream().filter(url -> !newImages.contains(url))
                .forEach(cloudinaryService::deleteImage);
        mapToEntity(req, p);
        p.setUpdatedAt(LocalDateTime.now());
        return ProductResponse.from(repo.save(p));
    }

    public void deleteProduct(Long id) {
        Product p = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found: " + id));
        parseList(p.getImages()).forEach(cloudinaryService::deleteImage);
        repo.deleteById(id);
    }

    public List<ProductResponse> getAllProductsAdmin() {
        return repo.findAllByOrderByCreatedAtDesc().stream()
                .map(ProductResponse::from).collect(Collectors.toList());
    }

    public List<ProductResponse> getActiveProducts(String search) {
        List<Product> list = (search != null && !search.isBlank())
                ? repo.findByActiveTrueAndNameContainingIgnoreCaseOrderByCreatedAtDesc(search.trim())
                : repo.findByActiveTrueOrderByCreatedAtDesc();
        return list.stream().map(ProductResponse::from).collect(Collectors.toList());
    }

    public ProductResponse getProductById(Long id) {
        return ProductResponse.from(repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found: " + id)));
    }

    private void mapToEntity(ProductRequest req, Product p) {
        p.setName(req.getName().trim());
        p.setDescription(req.getDescription() != null ? req.getDescription().trim() : "");
        p.setBoxQuantity(req.getBoxQuantity() != null ? req.getBoxQuantity() : 12);
        p.setSizes(req.getSizes()  != null ? String.join(",", req.getSizes())  : "");
        p.setImages(req.getImages() != null ? String.join(",", req.getImages()) : "");

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