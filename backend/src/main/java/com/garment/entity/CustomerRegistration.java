package com.garment.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "customer_registrations")
public class CustomerRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Basic Info ──────────────────────────────────────────────
    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false, unique = true, length = 10)
    private String phone;

    @Column(nullable = false)
    private String password; // BCrypt hashed

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CustomerType customerType;

    private String deliveryAddress;
    private String gstNo;
    private String brokerName;
    private String brokerPhone;

    // ── Account Status ──────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccountStatus status = AccountStatus.PENDING;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime reviewedAt;

    // ── Payment / Credit Config (set by admin on approval) ──────
    private Boolean creditEnabled = false;
    private Double creditLimit = 0.0;
    private Boolean advanceOption = false; // 30% advance + 70% credit

    // ── Enums ───────────────────────────────────────────────────
    public enum CustomerType {
        Wholesaler, Semi_Wholesaler, Retailer
    }

    public enum AccountStatus {
        PENDING, APPROVED, REJECTED
    }

    // ── Getters & Setters ────────────────────────────────────────
    public Long getId() { return id; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public CustomerType getCustomerType() { return customerType; }
    public void setCustomerType(CustomerType customerType) { this.customerType = customerType; }

    public String getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }

    public String getGstNo() { return gstNo; }
    public void setGstNo(String gstNo) { this.gstNo = gstNo; }

    public String getBrokerName() { return brokerName; }
    public void setBrokerName(String brokerName) { this.brokerName = brokerName; }

    public String getBrokerPhone() { return brokerPhone; }
    public void setBrokerPhone(String brokerPhone) { this.brokerPhone = brokerPhone; }

    public AccountStatus getStatus() { return status; }
    public void setStatus(AccountStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }

    public Boolean getCreditEnabled() { return creditEnabled; }
    public void setCreditEnabled(Boolean creditEnabled) { this.creditEnabled = creditEnabled; }

    public Double getCreditLimit() { return creditLimit; }
    public void setCreditLimit(Double creditLimit) { this.creditLimit = creditLimit; }

    public Boolean getAdvanceOption() { return advanceOption; }
    public void setAdvanceOption(Boolean advanceOption) { this.advanceOption = advanceOption; }
}