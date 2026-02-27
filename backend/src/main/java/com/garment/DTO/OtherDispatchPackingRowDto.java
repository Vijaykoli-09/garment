package com.garment.DTO;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class OtherDispatchPackingRowDto {

    private Long id;            // frontend key ke liye
    private String itemName;
    private BigDecimal quantity;
}