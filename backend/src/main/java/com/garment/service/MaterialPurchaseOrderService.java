package com.garment.service;

import java.util.List;

import com.garment.DTO.MaterialPurchaseOrderRequestDto;
import com.garment.DTO.MaterialPurchaseOrderResponseDto;

public interface MaterialPurchaseOrderService {

    String getNextOrderNo();

    MaterialPurchaseOrderResponseDto create(MaterialPurchaseOrderRequestDto dto);

    MaterialPurchaseOrderResponseDto update(Long id, MaterialPurchaseOrderRequestDto dto);

    List<MaterialPurchaseOrderResponseDto> getAll();

    void delete(Long id);

    MaterialPurchaseOrderResponseDto update1(Long id, MaterialPurchaseOrderRequestDto dto);
}