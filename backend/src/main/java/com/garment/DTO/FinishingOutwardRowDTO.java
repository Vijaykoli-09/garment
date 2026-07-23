package com.garment.DTO;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class FinishingOutwardRowDTO {

    private Long id;
    private String lotNo;
    private String itemName;
    private String shade;

    private String rolls;
    private String weight;
    private String rateFND;

    private String clothWt;
    private String ribWt;


    private String shortage;
    private String percentage;

    private String amount;
}