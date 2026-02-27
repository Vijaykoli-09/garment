package com.garment.DTO;

import java.time.LocalDate;
import java.util.List;

import lombok.Data;

@Data
public class PurchaseReturnRequestDTO {
    private LocalDate date;
    private String challanNo;
    private Long partyId;
    private List<PurchaseReturnItemDTO> items;
}
