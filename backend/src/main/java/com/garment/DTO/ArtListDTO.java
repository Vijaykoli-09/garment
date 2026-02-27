package com.garment.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ArtListDTO {
    private String serialNumber;
    private String artGroup;
    private String artName;
    private String artNo;
    private String styleName;
    private String season;
    private String brandName;
    private String saleRate;  // Changed to String to match entity
}