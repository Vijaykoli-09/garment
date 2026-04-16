package com.garment.DTO;

public class AppOrderItemRequest {

    private Long productId;
    private String productName;
    private String selectedSize;
    private Integer quantity;    // total pcs = boxes * pcsPerBox
    private Double pricePerPc;   // price per single piece

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

    // ── Safe subtotal helper ─────────────────────────────────────
    // Guards against null/zero pricePerPc causing a 0-paise Razorpay order
    // which makes the gateway silently refuse to open.
    public double safeItemTotal() {
        double price = (pricePerPc != null && pricePerPc > 0) ? pricePerPc : 0.0;
        int    qty   = (quantity   != null && quantity   > 0) ? quantity   : 0;
        return price * qty;
    }
}