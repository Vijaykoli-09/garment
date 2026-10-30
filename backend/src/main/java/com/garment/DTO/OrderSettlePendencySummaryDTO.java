package com.garment.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderSettlePendencySummaryDTO {
    private String partyName;
    private String artNo;
    private String sizeName;
    private Long settledBox;
}
