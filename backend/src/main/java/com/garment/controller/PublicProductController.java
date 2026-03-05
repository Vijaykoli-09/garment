package com.garment.controller;

import com.garment.DTO.ProductResponse;
import com.garment.service.ProductService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Public product endpoints for the React Native mobile app.
 * Returns ONLY active products. No auth needed.
 *
 * GET /api/products              → all active products
 * GET /api/products?search=tee   → search by name
 * GET /api/products/{id}         → single product detail
 */
@RestController
@RequestMapping("/api/products")
public class PublicProductController {

    private final ProductService service;

    public PublicProductController(ProductService service) {
        this.service = service;
    }

    // ── All active products (with optional search) ─────────────────
    @GetMapping
    public ResponseEntity<List<ProductResponse>> getAll(
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(service.getActiveProducts(search));
    }

    // ── Single product ─────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(service.getProductById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}