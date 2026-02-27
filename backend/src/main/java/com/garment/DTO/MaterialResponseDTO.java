package com.garment.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaterialResponseDTO {
	private Long id;
    private String serialNumber;
    private Long materialGroupId;
    private String materialGroupName;
    
    private String materialName;
    private String code;
    private String materialUnit;
    private Integer minimumStock;
    private Integer maximumStock;
 // ✅ New Field
    private Integer openingStock;
}
