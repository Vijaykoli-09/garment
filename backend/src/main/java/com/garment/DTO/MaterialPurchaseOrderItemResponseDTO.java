package com.garment.DTO;

import java.math.BigDecimal;

public class MaterialPurchaseOrderItemResponseDTO {
    public Long id;

    public Integer materialGroupId;
    public String materialGroupName;

    public Integer materialId;
    public String materialName;

    public String shadeCode;
    public String roll;

    public Integer quantity;
    public String unit;

    public BigDecimal rate;
    public BigDecimal amount;
}