package com.garment.DTO;

import java.time.LocalDate;
import java.util.List;

import lombok.Data;

@Data
public class MaterialPurchaseReturnRequestDTO {
    private LocalDate date;
    private String challanNo;
    private Long partyId;
    private List<MaterialPurchaseReturnItemDTO> items;
}