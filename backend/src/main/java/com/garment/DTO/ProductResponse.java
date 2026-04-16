package com.garment.DTO;

import com.garment.entity.Product;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class ProductResponse {

    private Long id;
    private String name;
    private String description;
    private List<String> categories;
    private String subCategory;
    private Integer boxQuantity;
    private List<String> sizes;
    private List<String> images;
    private Pricing pricing;
    private MinBox minBox;
    private Boolean active;
    private String createdAt;

    // Art relationship fields
    private String artSerialNumber;
    private String artNo;
    private String artName;

    // Shades: list of {shadeCode, shadeName} resolved objects
    // App and web both get full shade info — no extra lookup needed on frontend
    private List<ShadeInfo> shades;

    // ── Nested classes ────────────────────────────────────────────

    public static class ShadeInfo {
        private String shadeCode;
        private String shadeName;

        public ShadeInfo(String shadeCode, String shadeName) {
            this.shadeCode = shadeCode;
            this.shadeName = shadeName;
        }

        public String getShadeCode() { return shadeCode; }
        public String getShadeName() { return shadeName; }
    }

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

    // ── Factory: Entity -> DTO ────────────────────────────────────
    // shadeResolver: pass a function that takes shadeCode -> shadeName
    // In ProductService, inject ShadeRepository and pass it here
    public static ProductResponse from(Product p, java.util.function.Function<String, String> shadeResolver) {
        ProductResponse res = new ProductResponse();
        res.id          = p.getId();
        res.name        = p.getName();
        res.description = p.getDescription();
        res.subCategory = p.getSubCategory();
        res.boxQuantity = p.getBoxQuantity();
        res.active      = p.getActive();
        res.createdAt   = p.getCreatedAt() != null ? p.getCreatedAt().toString() : null;

        // Art fields
        res.artSerialNumber = p.getArtSerialNumber();
        res.artNo           = p.getArtNo();
        res.artName         = p.getArtName();

        res.categories = (p.getCategories() != null && !p.getCategories().isBlank())
                ? Arrays.asList(p.getCategories().split(","))
                : Collections.emptyList();

        res.sizes = (p.getSizes() != null && !p.getSizes().isBlank())
                ? Arrays.asList(p.getSizes().split(","))
                : Collections.emptyList();

        res.images = (p.getImages() != null && !p.getImages().isBlank())
                ? Arrays.asList(p.getImages().split(","))
                : Collections.emptyList();

        // Resolve shade codes -> ShadeInfo list
        if (p.getShades() != null && !p.getShades().isBlank()) {
            res.shades = Arrays.stream(p.getShades().split(","))
                    .map(String::trim)
                    .filter(code -> !code.isBlank())
                    .map(code -> new ShadeInfo(code, shadeResolver.apply(code)))
                    .collect(java.util.stream.Collectors.toList());
        } else {
            res.shades = Collections.emptyList();
        }

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

    // ── Getters ───────────────────────────────────────────────────
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
    public String getArtSerialNumber() { return artSerialNumber; }
    public String getArtNo() { return artNo; }
    public String getArtName() { return artName; }
    public List<ShadeInfo> getShades() { return shades; }
}