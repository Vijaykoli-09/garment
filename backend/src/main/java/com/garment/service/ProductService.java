package com.garment.service;

import com.garment.DTO.ProductRequest;
import com.garment.DTO.ProductResponse;
import com.garment.entity.Product;
import com.garment.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProductService {

    private final ProductRepository repo;
    private final CloudinaryService cloudinaryService;

    public ProductService(ProductRepository repo, CloudinaryService cloudinaryService) {
        this.repo = repo;
        this.cloudinaryService = cloudinaryService;
    }

    // ────────────────────────────────────────────────────────────────
    // CREATE
    // ────────────────────────────────────────────────────────────────
    public ProductResponse createProduct(ProductRequest req) {
        validateRequest(req);
        Product product = new Product();
        mapRequestToEntity(req, product);
        product.setCreatedAt(LocalDateTime.now());
        product.setActive(true);
        return ProductResponse.from(repo.save(product));
    }

    // ────────────────────────────────────────────────────────────────
    // UPDATE
    // Detects removed images → deletes them from Cloudinary
    // ────────────────────────────────────────────────────────────────
    public ProductResponse updateProduct(Long id, ProductRequest req) {
        validateRequest(req);

        Product product = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));

        // Find images removed by admin during edit
        List<String> oldImages = parseImages(product.getImages());
        List<String> newImages = req.getImages() != null ? req.getImages() : Collections.emptyList();

        List<String> removedImages = oldImages.stream()
                .filter(url -> !newImages.contains(url))
                .collect(Collectors.toList());

        // Delete removed images from Cloudinary
        if (!removedImages.isEmpty()) {
            System.out.println("[ProductService] Removing " + removedImages.size()
                    + " image(s) from Cloudinary for product: " + product.getName());
            removedImages.forEach(cloudinaryService::deleteImage);
        }

        mapRequestToEntity(req, product);
        product.setUpdatedAt(LocalDateTime.now());
        return ProductResponse.from(repo.save(product));
    }

    // ────────────────────────────────────────────────────────────────
    // DELETE — Hard delete from DB + all images deleted from Cloudinary
    // ────────────────────────────────────────────────────────────────
    public void deleteProduct(Long id) {
        Product product = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));

        // Delete ALL images from Cloudinary first
        List<String> images = parseImages(product.getImages());
        if (!images.isEmpty()) {
            System.out.println("[ProductService] Deleting " + images.size()
                    + " image(s) from Cloudinary for product: " + product.getName());
            images.forEach(cloudinaryService::deleteImage);
        }

        // Hard delete from DB — gone permanently
        repo.deleteById(id);
        System.out.println("[ProductService] Deleted product id: " + id);
    }

    // ────────────────────────────────────────────────────────────────
    // GET ALL — Admin
    // ────────────────────────────────────────────────────────────────
    public List<ProductResponse> getAllProductsAdmin() {
        return repo.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(ProductResponse::from)
                .collect(Collectors.toList());
    }

    // ────────────────────────────────────────────────────────────────
    // GET ALL — Mobile App (active only + optional search)
    // ────────────────────────────────────────────────────────────────
    public List<ProductResponse> getActiveProducts(String search) {
        List<Product> products;
        if (search != null && !search.isBlank()) {
            products = repo.findByActiveTrueAndNameContainingIgnoreCaseOrderByCreatedAtDesc(search.trim());
        } else {
            products = repo.findByActiveTrueOrderByCreatedAtDesc();
        }
        return products.stream()
                .map(ProductResponse::from)
                .collect(Collectors.toList());
    }

    // ────────────────────────────────────────────────────────────────
    // GET ONE
    // ────────────────────────────────────────────────────────────────
    public ProductResponse getProductById(Long id) {
        Product product = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
        return ProductResponse.from(product);
    }

    // ────────────────────────────────────────────────────────────────
    // HELPERS
    // ────────────────────────────────────────────────────────────────
    private List<String> parseImages(String imagesStr) {
        if (imagesStr == null || imagesStr.isBlank()) return new ArrayList<>();
        return Arrays.stream(imagesStr.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .collect(Collectors.toList());
    }

    private void validateRequest(ProductRequest req) {
        if (req.getName() == null || req.getName().isBlank())
            throw new RuntimeException("Product name is required.");
        if (req.getBoxQuantity() == null || req.getBoxQuantity() <= 0)
            throw new RuntimeException("Box quantity must be greater than 0.");
        if (req.getPricing() == null)
            throw new RuntimeException("Pricing is required.");
        if (req.getPricing().getWholeSeller() == null || req.getPricing().getWholeSeller() < 0 ||
            req.getPricing().getSemiWholeSeller() == null || req.getPricing().getSemiWholeSeller() < 0 ||
            req.getPricing().getRetailer() == null || req.getPricing().getRetailer() < 0)
            throw new RuntimeException("All pricing values must be 0 or greater.");
    }

    private void mapRequestToEntity(ProductRequest req, Product product) {
        product.setName(req.getName().trim());
        product.setDescription(req.getDescription() != null ? req.getDescription().trim() : "");
        product.setBoxQuantity(req.getBoxQuantity());
        product.setSizes(req.getSizes() != null ? String.join(",", req.getSizes()) : "");
        product.setImages(req.getImages() != null ? String.join(",", req.getImages()) : "");
        product.setPriceWholeSeller(req.getPricing().getWholeSeller());
        product.setPriceSemiWholeSeller(req.getPricing().getSemiWholeSeller());
        product.setPriceRetailer(req.getPricing().getRetailer());
    }
}