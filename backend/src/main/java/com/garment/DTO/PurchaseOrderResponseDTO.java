package com.garment.DTO;

import java.time.LocalDate;
import java.util.List;

import lombok.Data;
@Data
public class PurchaseOrderResponseDTO {
	private Long id;
    private String orderNo;
    private LocalDate date;
    private String partyName;
    private List<PurchaseOrderItemDTO> items;
    
}
