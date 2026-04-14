package com.garment.service;

import java.time.LocalDate;
import java.util.List;
import com.garment.DTO.OrderSettleDTO;

public interface OrderSettleService {

    OrderSettleDTO create(OrderSettleDTO dto);

    OrderSettleDTO update(Long id, OrderSettleDTO dto);

    OrderSettleDTO get(Long id);

    List<OrderSettleDTO> list();

    void delete(Long id);

    List<OrderSettleDTO> listByDateRange(LocalDate from, LocalDate to);
}