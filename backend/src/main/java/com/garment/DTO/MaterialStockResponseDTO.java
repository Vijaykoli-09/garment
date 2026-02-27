package com.garment.DTO;

import lombok.Data;

@Data
public class MaterialStockResponseDTO {
	 	private Long id;
	    private String groupName;
	    private String itemName;
	    private String shadeName;
	    private Double openingStock;
	    private Double purchase;
	    private Double consumed;
	    private Double balance;
}
