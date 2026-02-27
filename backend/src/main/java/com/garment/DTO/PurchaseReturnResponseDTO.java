package com.garment.DTO;

import java.time.LocalDate;
import java.util.List;

import lombok.Data;

@Data
public class PurchaseReturnResponseDTO {
    private Long id;
    private LocalDate date;
    private String challanNo;
    private Long partyId;
    private String partyName;
    private List<PurchaseReturnItemDTO> items;
}