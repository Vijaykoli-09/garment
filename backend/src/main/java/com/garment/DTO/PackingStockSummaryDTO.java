package com.garment.DTO;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Packed stock grouped by Art No + Size + Shade (all packing challans combined).
 * Used by the Dispatch screen instead of downloading every packing challan.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PackingStockSummaryDTO {
    private String artNo;
    private String description;
    private String size;
    private String shade;
    private Long box;
    private Long pcs;
    private Integer perBox;
    private BigDecimal rate;   // latest packing rate (> 0), or null
}