package com.garment.DTO;

import lombok.Data;
import java.util.List;

@Data
public class ArtResponseDTO {
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
    private List<AccessoryDetailModalResponseDTO> accessoryDetails; // THIS IS CRITICAL!
    private List<SizeDetailModalResponseDTO> sizeDetails;  // ADD THIS LINE
}