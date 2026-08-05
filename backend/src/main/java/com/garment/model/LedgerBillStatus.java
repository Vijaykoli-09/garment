// src/main/java/com/garment/model/LedgerBillStatus.java
package com.garment.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "ledger_bill_status",
        uniqueConstraints = @UniqueConstraint(columnNames = {"doc_key"})
)
public class LedgerBillStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Unique key across whole ledger. Example: "Dispatch:123", "Opening:Party:45"
    @Column(name = "doc_key", length = 120, nullable = false, unique = true)
    private String docKey;

    // User-controlled manual paid flag.
    // Effective manualPaid in UI = manualPaidUser OR (derived FIFO paidAuto)
    @Column(name = "manual_paid_user", nullable = false)
    private boolean manualPaidUser = false;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public LedgerBillStatus() {}

    public LedgerBillStatus(String docKey, boolean manualPaidUser) {
        this.docKey = docKey;
        this.manualPaidUser = manualPaidUser;
    }

    @PrePersist
    public void prePersist() {
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getDocKey() { return docKey; }
    public boolean isManualPaidUser() { return manualPaidUser; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public void setId(Long id) { this.id = id; }
    public void setDocKey(String docKey) { this.docKey = docKey; }
    public void setManualPaidUser(boolean manualPaidUser) { this.manualPaidUser = manualPaidUser; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}