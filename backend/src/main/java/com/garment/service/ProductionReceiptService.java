package com.garment.service;

import com.garment.DTO.ProductionReceiptDto;
import com.garment.DTO.ProductionReceiptConsumptionDTO;
import com.garment.DTO.ProductionReceiptListDTO;
import com.garment.DTO.ProductionReceiptResponseDto;
import com.garment.model.ProductionReceipt;
import com.garment.DTO.PagedResponse;
import java.util.List;

public interface ProductionReceiptService {
    ProductionReceiptResponseDto create(ProductionReceiptDto dto);
    ProductionReceiptResponseDto update(Long id, ProductionReceiptDto dto);
    List<ProductionReceiptResponseDto> listAll();
    PagedResponse<ProductionReceiptListDTO> listPaged(int page, int size, String search);
    List<ProductionReceiptConsumptionDTO> getConsumption(String processName, Long excludeReceiptId);
    ProductionReceiptResponseDto getById(Long id);
    void softDelete(Long id);

    // <CHANGE> Add this abstract method to match the implementation
    List<ProductionReceiptResponseDto> findByDeletedFalseOrderByDatedDesc();
}