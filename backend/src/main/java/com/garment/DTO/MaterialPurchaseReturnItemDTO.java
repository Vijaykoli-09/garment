package com.garment.DTO;

import lombok.Data;

@Data
public class MaterialPurchaseReturnItemDTO {
    private Long materialId;

    // template endpoint used by frontend: item.materialName
    private String materialName;

    // return list/edit used by frontend: i.itemName
    private String itemName;

    private String shadeCode;
    private String shadeName;

    private String returnRolls;
    private Double returnWeight;

    private Double quantity;

    private String unit;
    private Double rate;
    private Double amount;

    private String orderNo;
}