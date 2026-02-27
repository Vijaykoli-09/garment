package com.garment.DTO;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CuttingStockRowDTO {
    private Long id;
    private Integer sno;
    private Long finishingInwardRowId;
    private String itemName;
    private String shade;
    private String unit;
    private String consumption;
    private String kho;        // NEW
    private String consRate;
    private String consAmount;
}