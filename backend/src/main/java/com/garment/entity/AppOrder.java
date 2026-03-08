package com.garment.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
public class AppOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Customer reference ──────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private CustomerRegistration customer;

    // ── Order items ─────────────────────────────────────────────
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AppOrderItem> items = new ArrayList<>();

    // ── Amounts ─────────────────────────────────────────────────
    @Column(nullable = false)
    private Double subtotal;           // before GST

    @Column(nullable = false)
    private Double gstAmount;          // 18% GST

    @Column(nullable = false)
    private Double totalAmount;        // subtotal + GST

    // ── Payment ─────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    // Razorpay fields
    private String razorpayOrderId;    // created before payment
    private String razorpayPaymentId;  // filled after success
    private String razorpaySignature;  // filled after success

    // For advance+credit: how much was paid upfront
    private Double advanceAmount = 0.0;
    private Double creditAmount  = 0.0;

    // ── Order status ─────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus orderStatus = OrderStatus.PENDING;

    // ── Delivery ─────────────────────────────────────────────────
    private String deliveryAddress;

    // ── Timestamps ───────────────────────────────────────────────
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    // ── Enums ────────────────────────────────────────────────────
    public enum PaymentMethod {
        UPI, BANK_TRANSFER, DEBIT_CARD, CREDIT_CARD, CREDIT_ORDER, ADVANCE_CREDIT
    }

    public enum PaymentStatus {
        PENDING, PAID, FAILED, REFUNDED
    }

    public enum OrderStatus {
        PENDING, ACCEPTED, PROCESSING, SHIPPED, DELIVERED, CANCELLED
    }

    // ── Getters & Setters ─────────────────────────────────────────
    public Long getId() { return id; }

    public CustomerRegistration getCustomer() { return customer; }
    public void setCustomer(CustomerRegistration customer) { this.customer = customer; }

    public List<AppOrderItem> getItems() { return items; }
    public void setItems(List<AppOrderItem> items) { this.items = items; }

    public Double getSubtotal() { return subtotal; }
    public void setSubtotal(Double subtotal) { this.subtotal = subtotal; }

    public Double getGstAmount() { return gstAmount; }
    public void setGstAmount(Double gstAmount) { this.gstAmount = gstAmount; }

    public Double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }

    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }

    public PaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(PaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getRazorpayOrderId() { return razorpayOrderId; }
    public void setRazorpayOrderId(String razorpayOrderId) { this.razorpayOrderId = razorpayOrderId; }

    public String getRazorpayPaymentId() { return razorpayPaymentId; }
    public void setRazorpayPaymentId(String razorpayPaymentId) { this.razorpayPaymentId = razorpayPaymentId; }

    public String getRazorpaySignature() { return razorpaySignature; }
    public void setRazorpaySignature(String razorpaySignature) { this.razorpaySignature = razorpaySignature; }

    public Double getAdvanceAmount() { return advanceAmount; }
    public void setAdvanceAmount(Double advanceAmount) { this.advanceAmount = advanceAmount; }

    public Double getCreditAmount() { return creditAmount; }
    public void setCreditAmount(Double creditAmount) { this.creditAmount = creditAmount; }

    public OrderStatus getOrderStatus() { return orderStatus; }
    public void setOrderStatus(OrderStatus orderStatus) { this.orderStatus = orderStatus; }

    public String getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}