package com.garment.DTO;

import com.garment.entity.Product;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class ProductResponse {

    private Long id;
    private String name;
    private String description;
    private List<String> categories;   // e.g. ["MEN", "WOMEN"]
    private String subCategory;        // e.g. "T-Shirt"
    private Integer boxQuantity;
    private List<String> sizes;
    private List<String> images;
    private Pricing pricing;
    private MinBox minBox;
    private Boolean active;
    private String createdAt;

    // Price per BOX
    public static class Pricing {
        private Double wholeSeller;
        private Double semiWholeSeller;
        private Double retailer;

        public Pricing(Double w, Double s, Double r) {
            this.wholeSeller = w;
            this.semiWholeSeller = s;
            this.retailer = r;
        }
        public Double getWholeSeller() { return wholeSeller; }
        public Double getSemiWholeSeller() { return semiWholeSeller; }
        public Double getRetailer() { return retailer; }
    }

    // Min boxes per customer type
    public static class MinBox {
        private Integer wholeSeller;
        private Integer semiWholeSeller;
        private Integer retailer;

        public MinBox(Integer w, Integer s, Integer r) {
            this.wholeSeller = w;
            this.semiWholeSeller = s;
            this.retailer = r;
        }
        public Integer getWholeSeller() { return wholeSeller; }
        public Integer getSemiWholeSeller() { return semiWholeSeller; }
        public Integer getRetailer() { return retailer; }
    }

    // Factory: Entity -> DTO
    public static ProductResponse from(Product p) {
        ProductResponse res = new ProductResponse();
        res.id          = p.getId();
        res.name        = p.getName();
        res.description = p.getDescription();
        res.subCategory = p.getSubCategory();
        res.boxQuantity = p.getBoxQuantity();
        res.active      = p.getActive();
        res.createdAt   = p.getCreatedAt() != null ? p.getCreatedAt().toString() : null;

        res.categories = (p.getCategories() != null && !p.getCategories().isBlank())
                ? Arrays.asList(p.getCategories().split(","))
                : Collections.emptyList();

        res.sizes = (p.getSizes() != null && !p.getSizes().isBlank())
                ? Arrays.asList(p.getSizes().split(","))
                : Collections.emptyList();

        res.images = (p.getImages() != null && !p.getImages().isBlank())
                ? Arrays.asList(p.getImages().split(","))
                : Collections.emptyList();

        res.pricing = new Pricing(
                p.getPriceWholeSeller(),
                p.getPriceSemiWholeSeller(),
                p.getPriceRetailer()
        );

        res.minBox = new MinBox(
                p.getMinBoxWholeSeller(),
                p.getMinBoxSemiWholeSeller(),
                p.getMinBoxRetailer()
        );

        return res;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public List<String> getCategories() { return categories; }
    public String getSubCategory() { return subCategory; }
    public Integer getBoxQuantity() { return boxQuantity; }
    public List<String> getSizes() { return sizes; }
    public List<String> getImages() { return images; }
    public Pricing getPricing() { return pricing; }
    public MinBox getMinBox() { return minBox; }
    public Boolean getActive() { return active; }
    public String getCreatedAt() { return createdAt; }
}