package com.garment.service;

import java.util.List;

import com.garment.DTO.MaterialPurchasePendingRequest;
import com.garment.DTO.MaterialPurchasePendingRowDTO;

public interface MaterialPurchasePendingService {
    List<MaterialPurchasePendingRowDTO> getPending();
    List<Object[]> getPartiesByCategoryPurchase();
    List<Object[]> getMaterials();
    Object getPending(MaterialPurchasePendingRequest req);
}