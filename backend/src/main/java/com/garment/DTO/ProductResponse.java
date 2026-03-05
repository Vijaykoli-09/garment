package com.garment.DTO;

import com.garment.entity.Product;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * Converts the Product entity back to the exact shape that
 * AddProduct.tsx and ProductListScreen.tsx expect.
 */
public class ProductResponse {

    private Long id;
    private String name;
    private String description;
    private Integer boxQuantity;
    private List<String> sizes;
    private List<String> images;
    private Pricing pricing;
    private Boolean active;
    private String createdAt;

    public static class Pricing {
        private Double wholeSeller;
        private Double semiWholeSeller;
        private Double retailer;

        public Pricing(Double wholeSeller, Double semiWholeSeller, Double retailer) {
            this.wholeSeller = wholeSeller;
            this.semiWholeSeller = semiWholeSeller;
            this.retailer = retailer;
        }

        public Double getWholeSeller() { return wholeSeller; }
        public Double getSemiWholeSeller() { return semiWholeSeller; }
        public Double getRetailer() { return retailer; }
    }

    // ── Static factory: Entity → DTO ────────────────────────────
    public static ProductResponse from(Product p) {
        ProductResponse res = new ProductResponse();
        res.id = p.getId();
        res.name = p.getName();
        res.description = p.getDescription();
        res.boxQuantity = p.getBoxQuantity();
        res.active = p.getActive();
        res.createdAt = p.getCreatedAt() != null ? p.getCreatedAt().toString() : null;

        // Parse comma-separated sizes → List
        res.sizes = (p.getSizes() != null && !p.getSizes().isBlank())
                ? Arrays.asList(p.getSizes().split(","))
                : Collections.emptyList();

        // Parse comma-separated images → List
        res.images = (p.getImages() != null && !p.getImages().isBlank())
                ? Arrays.asList(p.getImages().split(","))
                : Collections.emptyList();

        res.pricing = new Pricing(
                p.getPriceWholeSeller(),
                p.getPriceSemiWholeSeller(),
                p.getPriceRetailer()
        );

        return res;
    }

    // Getters
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public Integer getBoxQuantity() { return boxQuantity; }
    public List<String> getSizes() { return sizes; }
    public List<String> getImages() { return images; }
    public Pricing getPricing() { return pricing; }
    public Boolean getActive() { return active; }
    public String getCreatedAt() { return createdAt; }
}