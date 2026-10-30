package com.garment.DTO;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductionReceiptConsumptionDTO {
    private String cardNo;
    private String artNo;
    private BigDecimal consumedPcs;
}
