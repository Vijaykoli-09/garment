// src/main/java/com/garment/DTO/LedgerManualPaidUpdateRequest.java
package com.garment.DTO;

public class LedgerManualPaidUpdateRequest {

    private String docKey;
    private boolean manualPaidUser;

    public LedgerManualPaidUpdateRequest() {}

    public String getDocKey() { return docKey; }
    public void setDocKey(String docKey) { this.docKey = docKey; }

    public boolean isManualPaidUser() { return manualPaidUser; }
    public void setManualPaidUser(boolean manualPaidUser) { this.manualPaidUser = manualPaidUser; }
}