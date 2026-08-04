package com.garment.DTO;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class DispatchReturnPackingRowDTO {
    private Long id;

    private String itemName;
    private BigDecimal quantity;
}