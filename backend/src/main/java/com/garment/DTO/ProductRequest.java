package com.garment.DTO;

import java.util.List;

/**
 * Used for both Create (POST) and Update (PUT) product requests.
 * Matches the Product interface in AddProduct.tsx exactly.
 */
public class ProductRequest {

    private String name;
    private String description;
    private Integer boxQuantity;

    // Frontend sends arrays, we convert to comma-separated for storage
    private List<String> sizes;   // ["S", "M", "L", "XL"]
    private List<String> images;  // ["https://...", "https://..."]

    // Nested pricing object — same shape as AddProduct.tsx
    private Pricing pricing;

    public static class Pricing {
        private Double wholeSeller;
        private Double semiWholeSeller;
        private Double retailer;

        public Double getWholeSeller() { return wholeSeller; }
        public void setWholeSeller(Double wholeSeller) { this.wholeSeller = wholeSeller; }

        public Double getSemiWholeSeller() { return semiWholeSeller; }
        public void setSemiWholeSeller(Double semiWholeSeller) { this.semiWholeSeller = semiWholeSeller; }

        public Double getRetailer() { return retailer; }
        public void setRetailer(Double retailer) { this.retailer = retailer; }
    }

    // Getters & Setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Integer getBoxQuantity() { return boxQuantity; }
    public void setBoxQuantity(Integer boxQuantity) { this.boxQuantity = boxQuantity; }

    public List<String> getSizes() { return sizes; }
    public void setSizes(List<String> sizes) { this.sizes = sizes; }

    public List<String> getImages() { return images; }
    public void setImages(List<String> images) { this.images = images; }

    public Pricing getPricing() { return pricing; }
    public void setPricing(Pricing pricing) { this.pricing = pricing; }
}