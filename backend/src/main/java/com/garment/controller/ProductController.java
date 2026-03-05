package com.garment.controller;

import com.garment.DTO.ProductRequest;
import com.garment.DTO.ProductResponse;
import com.garment.service.ProductService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * GET    /api/admin/products       → all products
 * GET    /api/admin/products/{id}  → single product
 * POST   /api/admin/products       → create
 * PUT    /api/admin/products/{id}  → update (removed images deleted from Cloudinary)
 * DELETE /api/admin/products/{id}  → hard delete from DB + all images deleted from Cloudinary
 */
@RestController
@RequestMapping("/api/admin/products")
public class ProductController {

    private final ProductService service;

    public ProductController(ProductService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<ProductResponse>> getAll() {
        return ResponseEntity.ok(service.getAllProductsAdmin());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(service.getProductById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ProductRequest req) {
        try {
            return ResponseEntity.ok(service.createProduct(req));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody ProductRequest req) {
        try {
            return ResponseEntity.ok(service.updateProduct(id, req));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Hard delete — removes from DB + deletes all images from Cloudinary
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            service.deleteProduct(id);
            return ResponseEntity.ok(Map.of("message", "Product deleted successfully."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}