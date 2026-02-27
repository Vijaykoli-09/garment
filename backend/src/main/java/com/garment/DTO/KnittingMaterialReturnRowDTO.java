package com.garment.DTO;

import lombok.Data;

@Data
public class KnittingMaterialReturnRowDTO {
    private Long id; // optional for existing row
    private Long materialId;
    private String shadeCode;
    private String rolls;
    private Integer wtPerBox;
    private Double weight;
    private Double rate;
    private Double amount;
    private String unit;
}
