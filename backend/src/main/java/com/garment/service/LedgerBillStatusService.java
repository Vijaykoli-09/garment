// src/main/java/com/garment/service/LedgerBillStatusService.java
package com.garment.service;

import com.garment.DTO.LedgerBillStatusDTO;

import java.util.List;

public interface LedgerBillStatusService {

    LedgerBillStatusDTO getByDocKey(String docKey);

    List<LedgerBillStatusDTO> bulkGetByDocKeys(List<String> docKeys);

    LedgerBillStatusDTO upsertManualPaidUser(String docKey, boolean manualPaidUser);
}