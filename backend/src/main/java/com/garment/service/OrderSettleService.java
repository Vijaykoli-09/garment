package com.garment.service;

import java.time.LocalDate;
import java.util.List;
import com.garment.DTO.OrderSettleDTO;
import com.garment.DTO.OrderSettleListDTO;
import com.garment.DTO.OrderSettlePendencySummaryDTO;
import com.garment.DTO.PagedResponse;

public interface OrderSettleService {

    OrderSettleDTO create(OrderSettleDTO dto);

    OrderSettleDTO update(Long id, OrderSettleDTO dto);

    OrderSettleDTO get(Long id);

    List<OrderSettleDTO> list();
    PagedResponse<OrderSettleListDTO> listPaged(int page, int size, String search);
    List<OrderSettlePendencySummaryDTO> pendencySummary(
            Long partyId, LocalDate fromDate, LocalDate toDate, List<String> artNos);

    void delete(Long id);

    List<OrderSettleDTO> listByDateRange(LocalDate from, LocalDate to);
}