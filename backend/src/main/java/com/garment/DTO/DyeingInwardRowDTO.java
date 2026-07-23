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
    private String rolls;
    private String weight;

    private String shortage;     // renamed from wastage
    private String percentage;   // NEW

    private String knittingYarnRate;
    private String dyeingRate;
    private String amount;
}