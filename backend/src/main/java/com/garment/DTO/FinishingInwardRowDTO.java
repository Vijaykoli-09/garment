package com.garment.DTO;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FinishingInwardRowDTO {
    private Long id;
    private String lotNo;
    private String itemName;
    private String processing;
    private String wastage;
    private String extraWt;
    private String shade;
    private String rateFND;
    private String rolls;
    private String weight;


    private String percentage;

    private String rate;
    private String amount;
}