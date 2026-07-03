package com.garment.DTO;

import java.time.LocalDate;
import java.util.List;

public class MaterialPurchaseOrderRequestDto {
    public String orderNo; // frontend sends; backend will ignore on CREATE
    public LocalDate date;
    public Integer partyId;
    public List<MaterialPurchaseOrderItemRequestDto> items;
}