package com.garment.service;

import java.util.List;

import com.garment.DTO.PurchasePendingRequest;
import com.garment.DTO.PurchasePendingRowDTO;

public interface PurchasePendingService {
	  List<PurchasePendingRowDTO> getPending(PurchasePendingRequest req);
	  List<Object[]> getFilterParties();
	  List<Object[]> getFilterItems();
}
