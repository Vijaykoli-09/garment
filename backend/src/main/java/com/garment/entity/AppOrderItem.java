package com.garment.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "order_items")
public class AppOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private AppOrder order;

    // ── Product snapshot (stored at time of order) ───────────────
    @Column(nullable = false)
    private Long productId;

    @Column(nullable = false)
    private String productName;

    @Column(nullable = false)
    private String selectedSize;

    @Column(nullable = false)
    private Integer quantity;      // total pcs

    @Column(nullable = false)
    private Double pricePerPc;

    @Column(nullable = false)
    private Double itemTotal;      // pricePerPc * quantity

    // ── Getters & Setters ─────────────────────────────────────────
    public Long getId() { return id; }

    public AppOrder getOrder() { return order; }
    public void setOrder(AppOrder order) { this.order = order; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getSelectedSize() { return selectedSize; }
    public void setSelectedSize(String selectedSize) { this.selectedSize = selectedSize; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public Double getPricePerPc() { return pricePerPc; }
    public void setPricePerPc(Double pricePerPc) { this.pricePerPc = pricePerPc; }

    public Double getItemTotal() { return itemTotal; }
    public void setItemTotal(Double itemTotal) { this.itemTotal = itemTotal; }
}