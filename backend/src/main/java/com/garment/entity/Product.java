package com.garment.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Basic Info ──────────────────────────────────────────────
    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    // ── Box quantity (pcs per box) ──────────────────────────────
    @Column(nullable = false)
    private Integer boxQuantity = 12;

    // ── Sizes — stored as comma-separated string ────────────────
    // e.g. "S,M,L,XL,XXL"
    @Column(columnDefinition = "TEXT")
    private String sizes;

    // ── Images — stored as comma-separated URLs ─────────────────
    @Column(columnDefinition = "TEXT")
    private String images;

    // ── 3-Tier Pricing ──────────────────────────────────────────
    @Column(nullable = false)
    private Double priceWholeSeller = 0.0;

    @Column(nullable = false)
    private Double priceSemiWholeSeller = 0.0;

    @Column(nullable = false)
    private Double priceRetailer = 0.0;

    // ── Soft delete / active flag ───────────────────────────────
    @Column(nullable = false)
    private Boolean active = true;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    // ── Getters & Setters ────────────────────────────────────────

    public Long getId() { return id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Integer getBoxQuantity() { return boxQuantity; }
    public void setBoxQuantity(Integer boxQuantity) { this.boxQuantity = boxQuantity; }

    public String getSizes() { return sizes; }
    public void setSizes(String sizes) { this.sizes = sizes; }

    public String getImages() { return images; }
    public void setImages(String images) { this.images = images; }

    public Double getPriceWholeSeller() { return priceWholeSeller; }
    public void setPriceWholeSeller(Double priceWholeSeller) { this.priceWholeSeller = priceWholeSeller; }

    public Double getPriceSemiWholeSeller() { return priceSemiWholeSeller; }
    public void setPriceSemiWholeSeller(Double priceSemiWholeSeller) { this.priceSemiWholeSeller = priceSemiWholeSeller; }

    public Double getPriceRetailer() { return priceRetailer; }
    public void setPriceRetailer(Double priceRetailer) { this.priceRetailer = priceRetailer; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}