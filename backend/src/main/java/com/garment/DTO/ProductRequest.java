package com.garment.DTO;

import java.util.List;

public class ProductRequest {

    private String name;
    private String description;
    private List<String> categories;   // e.g. ["MEN", "WOMEN"]
    private String subCategory;        // e.g. "T-Shirt"
    private Integer boxQuantity;
    private List<String> sizes;
    private List<String> images;
    private Pricing pricing;
    private MinBox minBox;

    // Price per BOX
    public static class Pricing {
        private Double wholeSeller;
        private Double semiWholeSeller;
        private Double retailer;

        public Double getWholeSeller() { return wholeSeller; }
        public void setWholeSeller(Double v) { this.wholeSeller = v; }
        public Double getSemiWholeSeller() { return semiWholeSeller; }
        public void setSemiWholeSeller(Double v) { this.semiWholeSeller = v; }
        public Double getRetailer() { return retailer; }
        public void setRetailer(Double v) { this.retailer = v; }
    }

    // Minimum boxes per customer type
    public static class MinBox {
        private Integer wholeSeller;
        private Integer semiWholeSeller;
        private Integer retailer;

        public Integer getWholeSeller() { return wholeSeller; }
        public void setWholeSeller(Integer v) { this.wholeSeller = v; }
        public Integer getSemiWholeSeller() { return semiWholeSeller; }
        public void setSemiWholeSeller(Integer v) { this.semiWholeSeller = v; }
        public Integer getRetailer() { return retailer; }
        public void setRetailer(Integer v) { this.retailer = v; }
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public List<String> getCategories() { return categories; }
    public void setCategories(List<String> categories) { this.categories = categories; }
    public String getSubCategory() { return subCategory; }
    public void setSubCategory(String subCategory) { this.subCategory = subCategory; }
    public Integer getBoxQuantity() { return boxQuantity; }
    public void setBoxQuantity(Integer boxQuantity) { this.boxQuantity = boxQuantity; }
    public List<String> getSizes() { return sizes; }
    public void setSizes(List<String> sizes) { this.sizes = sizes; }
    public List<String> getImages() { return images; }
    public void setImages(List<String> images) { this.images = images; }
    public Pricing getPricing() { return pricing; }
    public void setPricing(Pricing pricing) { this.pricing = pricing; }
    public MinBox getMinBox() { return minBox; }
    public void setMinBox(MinBox minBox) { this.minBox = minBox; }
}