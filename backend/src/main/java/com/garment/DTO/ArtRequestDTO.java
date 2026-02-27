package com.garment.DTO;

import lombok.Data;
import java.util.List;

@Data
public class ArtRequestDTO {
    private String serialNumber;
    private String artGroup;
    private String artName;
    private String artNo;
    private String copyFromArtName;
    private String styleRate;
    private String saleRate;
    private String styleName;
    private String openingBalance;
    private String brandName;
    private String workOnArt;
    private String rateTotal;

    private List<ProcessDTO> processes;
    private List<ShadeDTO> shades;
    private List<SizeDTO> sizes;
    private List<AccessoryDTO> accessories;
    private List<AccessoryDetailModalDTO> accessoryDetails; // THIS IS CRITICAL!
    private List<SizeDetailModalDTO> sizeDetails;  // ADD THIS LINE
}