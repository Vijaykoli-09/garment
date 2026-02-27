package com.garment.DTO;

import java.time.LocalDate;
import java.util.List;

import lombok.Data;

@Data
public class PurchaseEntryRequestDTO {
	private LocalDate date;
    private Long partyId;
    private String challanNo;
    private Long purchaseEntryId;
    private List<PurchaseEntryItemDTO> items;

}
