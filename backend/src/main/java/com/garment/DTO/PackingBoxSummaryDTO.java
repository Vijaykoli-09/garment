package com.garment.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PackingBoxSummaryDTO {
    private String cuttingLotNo;
    private String sizeName;
    private Integer boxCount;
}
