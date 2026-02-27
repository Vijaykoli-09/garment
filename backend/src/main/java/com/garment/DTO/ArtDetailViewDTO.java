package com.garment.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ArtDetailViewDTO {
    private String serialNumber;
    private String artGroup;
    private String artName;
    private String artNo;
    private String styleRate;
    private String saleRate;
    private String styleName;
    private String season;
    private String copyFromArtName;
    private String openingBalance;
    private String wtPcs;
    private String reference;
    private String brandName;
    private String workOnArt;
    private String rateTotal;
    
    private List<ProcessDTO> processes;
    private List<ShadeDTO> shades;
    private List<SizeDTO> sizes;
    private List<AccessoryDTO> accessories;
    private List<AccessoryDetailModalResponseDTO> accessoryDetails;
}