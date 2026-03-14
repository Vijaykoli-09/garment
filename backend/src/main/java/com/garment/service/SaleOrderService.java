package com.garment.service;

import java.time.LocalDate;
import java.util.List;

import com.garment.DTO.PendencyFulfillRequestDTO;
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

    // Pendency aggregation
    List<SaleOrderPendencyRowDTO> pendency(
            LocalDate from,
            LocalDate to,
            List<String> destinationsUpper, // station names UPPER
            List<Long> partyIds,
            List<String> artNosLower,      // art no lower
            List<String> sizeNamesUpper,   // size upper ("M", "L", "XL"...)
            List<String> shadeNamesUpper   // shade upper
    );

    // NEW: fulfill all pending for given rows
    void fulfillPendency(PendencyFulfillRequestDTO req);
}