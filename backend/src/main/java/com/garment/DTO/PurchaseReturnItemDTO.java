package com.garment.DTO;

import lombok.Data;

@Data
public class PurchaseReturnItemDTO {
    private Long materialId;
    private String materialName;
    private String ItemName;
    private String shadeCode;
    private String shadeName;
    private String returnRolls;
    private Integer quantity;
    private String unit;
    private Double rate;
    private Double amount;
    private String orderNo;
}
