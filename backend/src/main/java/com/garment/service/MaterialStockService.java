package com.garment.service;

import java.util.List;

import com.garment.DTO.MaterialStockRequestDTO;
import com.garment.DTO.MaterialStockResponseDTO;
import com.garment.model.KnittingOutwardChallanRow;
import com.garment.model.PurchaseEntryItem;
import com.garment.model.PurchaseOrderItem;

public interface MaterialStockService {
	// 🔹 Add Purchase Entry quantity to stock (Credit)
    void creditStock(PurchaseEntryItem entryItem);

    // 🔹 Subtract Knitting Outward quantity from stock (Debit)
    void debitStockFromKnittingOutward(KnittingOutwardChallanRow row);

    // 🔹 Fetch Material Stock Report based on selected filters
    List<MaterialStockResponseDTO> getStockReport(MaterialStockRequestDTO request);

	
}
