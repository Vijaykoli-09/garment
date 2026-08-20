package com.garment.DTO;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class DispatchReturnPackingRowDTO {

    private Long id; // for React key only
    private String itemName;
    private BigDecimal quantity;
}