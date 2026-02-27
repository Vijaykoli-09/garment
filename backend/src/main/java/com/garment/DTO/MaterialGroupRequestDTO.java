package com.garment.DTO;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
public class MaterialGroupRequestDTO {
	 	private String materialGroup;
	    private String materialType;
	    private String unitOfMeasure;
	    private Double costOfMaterial;
	    private LocalDate dateOfPurchased;
	    private String supplierName;
}
