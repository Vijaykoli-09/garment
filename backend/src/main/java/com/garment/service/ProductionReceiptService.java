package com.garment.service;

import com.garment.DTO.ProductionReceiptDto;
import com.garment.DTO.ProductionReceiptResponseDto;
import com.garment.model.ProductionReceipt;
import java.util.List;

public interface ProductionReceiptService {
    ProductionReceiptResponseDto create(ProductionReceiptDto dto);
    ProductionReceiptResponseDto update(Long id, ProductionReceiptDto dto);
    List<ProductionReceiptResponseDto> listAll();
    ProductionReceiptResponseDto getById(Long id);
    void softDelete(Long id);

    // <CHANGE> Add this abstract method to match the implementation
    List<ProductionReceiptResponseDto> findByDeletedFalseOrderByDatedDesc();
}