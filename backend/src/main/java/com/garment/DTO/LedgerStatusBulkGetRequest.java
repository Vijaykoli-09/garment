// src/main/java/com/garment/DTO/LedgerStatusBulkGetRequest.java
package com.garment.DTO;

import java.util.List;

public class LedgerStatusBulkGetRequest {

    private List<String> keys;

    public LedgerStatusBulkGetRequest() {}

    public List<String> getKeys() { return keys; }
    public void setKeys(List<String> keys) { this.keys = keys; }
}