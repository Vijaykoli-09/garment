package com.garment.DTO;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

// Using String for numerical fields (like in the entity) to mirror the data type, 
// but typically they should be converted to numeric types (e.g., BigDecimal, Integer) for calculation/validation.
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FinishingOutwardRowDTO {

    private Long id; // Included for updates/retrieval
    // private String lotInternalNo;
    private String lotNo;
    private String itemName;
    private String shade;
    private String mcSize;
    private String greyGSM;
    private String regdGSM;
    private String rolls;
    private String weight;
    private String rateFND;
    // private String rate;
    private String clothWt;
    private String ribWt;
    private String amount;
}