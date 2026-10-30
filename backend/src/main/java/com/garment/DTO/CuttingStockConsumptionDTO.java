package com.garment.DTO;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CuttingStockConsumptionDTO {
    private String itemName;
    private String shade;
    private BigDecimal consumption;
}
