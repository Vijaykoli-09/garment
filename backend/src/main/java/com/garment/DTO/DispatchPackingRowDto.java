package com.garment.DTO;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class DispatchPackingRowDto {

    private Long id;            // for React key only
    private String itemName;
    private BigDecimal quantity;
}