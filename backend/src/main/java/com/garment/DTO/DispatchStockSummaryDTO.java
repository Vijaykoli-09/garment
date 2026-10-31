package com.garment.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Aggregated Dispatch stock deduction, grouped by Art No + Size + Shade.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DispatchStockSummaryDTO {
    private String artNo;
    private String description;
    private String size;
    private String shade;
    private Integer box;
    private Integer pcsPerBox;
    private Integer pcs;
}
