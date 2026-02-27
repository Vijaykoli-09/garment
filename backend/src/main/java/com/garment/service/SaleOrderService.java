package com.garment.service;

import java.time.LocalDate;
import java.util.List;

import com.garment.DTO.SaleOrderDTO;
import com.garment.DTO.SaleOrderPendencyRowDTO;
import com.garment.DTO.SaleOrderSaveDTO;

public interface SaleOrderService {
    SaleOrderDTO create(SaleOrderSaveDTO dto);
    SaleOrderDTO update(Long id, SaleOrderSaveDTO dto);
    SaleOrderDTO get(Long id);
    List<SaleOrderDTO> list();
    void delete(Long id);
    String nextOrderNo();

    // NEW: pendency aggregation
    List<SaleOrderPendencyRowDTO> pendency(
            LocalDate from,
            LocalDate to,
            List<String> destinationsUpper, // station names (UPPER)
            List<Long> partyIds,
            List<String> artNosLower,
            List<String> sizeNamesUpper
    );
}