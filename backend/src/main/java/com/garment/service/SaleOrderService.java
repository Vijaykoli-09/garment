package com.garment.service;

import java.time.LocalDate;
import java.util.List;

import com.garment.DTO.PendencyFulfillRequestDTO;
import com.garment.DTO.SaleOrderDTO;
import com.garment.DTO.SaleOrderListDTO;
import com.garment.DTO.SaleOrderPendencyRowDTO;
import com.garment.DTO.SaleOrderSaveDTO;
import com.garment.DTO.PagedResponse;

public interface SaleOrderService {

    SaleOrderDTO create(SaleOrderSaveDTO dto);
    SaleOrderDTO update(Long id, SaleOrderSaveDTO dto);
    SaleOrderDTO get(Long id);
    List<SaleOrderDTO> list();
    List<SaleOrderDTO> listByParty(Long partyId, String partyName);
    PagedResponse<SaleOrderListDTO> listPaged(int page, int size, String search);
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