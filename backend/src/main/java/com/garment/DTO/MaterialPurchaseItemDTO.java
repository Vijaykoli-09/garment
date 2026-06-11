package com.garment.DTO;

import lombok.Data;

@Data
public class MaterialPurchaseItemDTO {

    private Long materialId;
    private String materialName;
    private String shadeCode;
    private String shadeName;
    private Double roll;
    private Double wtPerBox;
    private Double rate;
    private Double amount;
    private String orderNo;
}