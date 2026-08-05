package com.garment.DTO;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaterialStockAdjustmentRequest {
    private String adjDate;          // YYYY-MM-DD (required)
    private Long materialGroupId;    // required
    private Long materialId;         // required
    private String shadeName;        // optional
    private BigDecimal qtyDelta;     // required
    private String remarks;          // optional
}