package com.garment.DTO;

import java.time.LocalDate;
import java.util.List;

public class MaterialPurchaseOrderResponseDto {
    public Long id;
    public String orderNo;
    public LocalDate date;

    public Integer partyId;
    public String partyName;

    public List<MaterialPurchaseOrderItemResponseDTO> items;
}