package com.garment.DTO;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CuttingLotRowDTO {
    private Long id;
    private Integer sno;
    private String cutLotNo;
    private String artNo;
    private String itemName;
    private String shade;
    private String pcs;
    private String rate;
    private String amount;
}