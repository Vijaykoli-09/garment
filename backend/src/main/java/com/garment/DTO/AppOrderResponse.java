package com.garment.DTO;

import com.garment.entity.AppOrder;
import com.garment.entity.AppOrderItem;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Safe DTO for returning order data to the mobile app.
 * Avoids JSON infinite loop from AppOrder → customer → AppOrder
 * and exposes no sensitive fields (password, signature, etc.)
 */
public class AppOrderResponse {

    private Long   id;
    private String razorpayOrderId;
    private String razorpayKeyId;   // only set on create, null on fetch
    private Double totalAmount;
    private Double subtotal;
    private Double gstAmount;
    private Double advanceAmount;
    private Double creditAmount;
    private String orderStatus;
    private String paymentStatus;
    private String paymentMethod;
    private String deliveryAddress;
    private String createdAt;
    private List<ItemDTO> items;

    public static class ItemDTO {
        private Long    productId;
        private String  productName;
        private String  selectedSize;
        private Integer quantity;
        private Double  pricePerPc;
        private Double  itemTotal;

        public static ItemDTO from(AppOrderItem i) {
            ItemDTO d = new ItemDTO();
            d.productId    = i.getProductId();
            d.productName  = i.getProductName();
            d.selectedSize = i.getSelectedSize();
            d.quantity     = i.getQuantity();
            d.pricePerPc   = i.getPricePerPc();
            d.itemTotal    = i.getItemTotal();
            return d;
        }

        public Long    getProductId()    { return productId; }
        public String  getProductName()  { return productName; }
        public String  getSelectedSize() { return selectedSize; }
        public Integer getQuantity()     { return quantity; }
        public Double  getPricePerPc()   { return pricePerPc; }
        public Double  getItemTotal()    { return itemTotal; }
    }

    // Factory: entity → DTO (used for list + detail endpoints)
    public static AppOrderResponse from(AppOrder o) {
        AppOrderResponse r = new AppOrderResponse();
        r.id              = o.getId();
        r.razorpayOrderId = o.getRazorpayOrderId();
        r.razorpayKeyId   = null;
        r.totalAmount     = o.getTotalAmount();
        r.subtotal        = o.getSubtotal();
        r.gstAmount       = o.getGstAmount();
        r.advanceAmount   = o.getAdvanceAmount();
        r.creditAmount    = o.getCreditAmount();
        r.orderStatus     = o.getOrderStatus().name();
        r.paymentStatus   = o.getPaymentStatus().name();
        r.paymentMethod   = o.getPaymentMethod().name();
        r.deliveryAddress = o.getDeliveryAddress();
        r.createdAt       = o.getCreatedAt() != null ? o.getCreatedAt().toString() : null;
        r.items           = o.getItems().stream()
                              .map(ItemDTO::from)
                              .collect(Collectors.toList());
        return r;
    }

    // No-arg constructor required by the static from() factory and Jackson
    public AppOrderResponse() {}

    // Constructor used by createRazorpayOrder and verifyPayment
    public AppOrderResponse(Long id, String razorpayOrderId, String razorpayKeyId,
                            Double totalAmount, String orderStatus, String paymentStatus,
                            String paymentMethod, String createdAt) {
        this.id              = id;
        this.razorpayOrderId = razorpayOrderId;
        this.razorpayKeyId   = razorpayKeyId;
        this.totalAmount     = totalAmount;
        this.orderStatus     = orderStatus;
        this.paymentStatus   = paymentStatus;
        this.paymentMethod   = paymentMethod;
        this.createdAt       = createdAt;
    }

    public Long    getId()              { return id; }
    public String  getRazorpayOrderId() { return razorpayOrderId; }
    public String  getRazorpayKeyId()   { return razorpayKeyId; }
    public Double  getTotalAmount()     { return totalAmount; }
    public Double  getSubtotal()        { return subtotal; }
    public Double  getGstAmount()       { return gstAmount; }
    public Double  getAdvanceAmount()   { return advanceAmount; }
    public Double  getCreditAmount()    { return creditAmount; }
    public String  getOrderStatus()     { return orderStatus; }
    public String  getPaymentStatus()   { return paymentStatus; }
    public String  getPaymentMethod()   { return paymentMethod; }
    public String  getDeliveryAddress() { return deliveryAddress; }
    public String  getCreatedAt()       { return createdAt; }
    public List<ItemDTO> getItems()     { return items; }
}