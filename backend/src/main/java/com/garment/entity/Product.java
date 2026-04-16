package com.garment.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    // Multiple categories stored as comma-separated: "MEN,WOMEN" or "MEN,WOMEN,KIDS"
    @Column(nullable = true)
    private String categories = "";

    // Single sub-category e.g. "T-Shirt", "Ladies Pouch", etc.
    @Column(nullable = true)
    private String subCategory = "";

    // How many pieces are in 1 box
    @Column(nullable = false)
    private Integer boxQuantity = 12;

    // Sizes stored as comma-separated: "S,M,L,XL,XXL"
    @Column(columnDefinition = "TEXT")
    private String sizes;

    // Image URLs stored as comma-separated
    @Column(columnDefinition = "TEXT")
    private String images;

    // ── Art Relationship Fields ───────────────────────────────────
    @Column(name = "art_serial_number")
    private String artSerialNumber;

    @Column(name = "art_no")
    private String artNo;

    @Column(name = "art_name")
    private String artName;

    // ── Shades assigned to this product (comma-separated shade codes) ──
    // e.g. "SH001,SH002,SH003"
    @Column(name = "shades", columnDefinition = "TEXT")
    private String shades;

    // ── Price per BOX for each customer type ─────────────────────
    @Column(nullable = false)
    private Double priceWholeSeller = 0.0;

    @Column(nullable = false)
    private Double priceSemiWholeSeller = 0.0;

    @Column(nullable = false)
    private Double priceRetailer = 0.0;

    // ── Minimum boxes required per customer type ──────────────────
    @Column(nullable = false)
    private Integer minBoxWholeSeller = 10;

    @Column(nullable = false)
    private Integer minBoxSemiWholeSeller = 8;

    @Column(nullable = false)
    private Integer minBoxRetailer = 5;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    // ── Getters and Setters ──────────────────────────────────────
    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCategories() { return categories; }
    public void setCategories(String categories) { this.categories = categories; }
    public String getSubCategory() { return subCategory; }
    public void setSubCategory(String subCategory) { this.subCategory = subCategory; }
    public Integer getBoxQuantity() { return boxQuantity; }
    public void setBoxQuantity(Integer boxQuantity) { this.boxQuantity = boxQuantity; }
    public String getSizes() { return sizes; }
    public void setSizes(String sizes) { this.sizes = sizes; }
    public String getImages() { return images; }
    public void setImages(String images) { this.images = images; }

    // Art relationship getters/setters
    public String getArtSerialNumber() { return artSerialNumber; }
    public void setArtSerialNumber(String artSerialNumber) { this.artSerialNumber = artSerialNumber; }
    public String getArtNo() { return artNo; }
    public void setArtNo(String artNo) { this.artNo = artNo; }
    public String getArtName() { return artName; }
    public void setArtName(String artName) { this.artName = artName; }

    // Shades getter/setter
    public String getShades() { return shades; }
    public void setShades(String shades) { this.shades = shades; }

    public Double getPriceWholeSeller() { return priceWholeSeller; }
    public void setPriceWholeSeller(Double v) { this.priceWholeSeller = v; }
    public Double getPriceSemiWholeSeller() { return priceSemiWholeSeller; }
    public void setPriceSemiWholeSeller(Double v) { this.priceSemiWholeSeller = v; }
    public Double getPriceRetailer() { return priceRetailer; }
    public void setPriceRetailer(Double v) { this.priceRetailer = v; }
    public Integer getMinBoxWholeSeller() { return minBoxWholeSeller; }
    public void setMinBoxWholeSeller(Integer v) { this.minBoxWholeSeller = v; }
    public Integer getMinBoxSemiWholeSeller() { return minBoxSemiWholeSeller; }
    public void setMinBoxSemiWholeSeller(Integer v) { this.minBoxSemiWholeSeller = v; }
    public Integer getMinBoxRetailer() { return minBoxRetailer; }
    public void setMinBoxRetailer(Integer v) { this.minBoxRetailer = v; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}