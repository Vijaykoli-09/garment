package com.garment.DTO;

import java.math.BigDecimal;

public class MaterialPurchaseOrderItemRequestDto {
    public Integer materialGroupId;
    public Integer materialId;
    public String shadeCode;
    public String roll;
    public Integer quantity;
    public String unit;
    public BigDecimal rate;
    public BigDecimal amount;
}