// src/main/java/com/garment/DTO/LedgerBillStatusDTO.java
package com.garment.DTO;

import java.time.LocalDateTime;

public class LedgerBillStatusDTO {

    private String docKey;
    private boolean manualPaidUser;
    private LocalDateTime updatedAt;

    public LedgerBillStatusDTO() {}

    public LedgerBillStatusDTO(String docKey, boolean manualPaidUser, LocalDateTime updatedAt) {
        this.docKey = docKey;
        this.manualPaidUser = manualPaidUser;
        this.updatedAt = updatedAt;
    }

    public String getDocKey() { return docKey; }
    public void setDocKey(String docKey) { this.docKey = docKey; }

    public boolean isManualPaidUser() { return manualPaidUser; }
    public void setManualPaidUser(boolean manualPaidUser) { this.manualPaidUser = manualPaidUser; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}