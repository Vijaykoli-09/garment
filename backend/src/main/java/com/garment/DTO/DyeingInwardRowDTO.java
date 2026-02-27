package com.garment.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DyeingInwardRowDTO {
    private Long id;
    private String fabricLotNo;
    private String fabric;
    private String shade;
    private String mcSize;
    private String greyGSM;
    private String regdSize;
    private String rolls;
    private String weight;
    private String wastage;
    private String knittingYarnRate;
    private String dyeingRate;
    private String amount;
}