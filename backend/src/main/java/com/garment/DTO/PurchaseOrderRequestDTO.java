package com.garment.DTO;

import java.time.LocalDate;
import java.util.List;

import lombok.Data;

@Data
public class PurchaseOrderRequestDTO {
	private String orderNo;
    private LocalDate date;
    private Long partyId;
    private List<PurchaseOrderItemDTO> items;

}
