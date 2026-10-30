package com.garment.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseEntryListDTO {
    private Long id;
    private String challanNo;
    private String date;
    private String partyName;
    private String yarnNames;
    private String materialNames;
    private Long totalWtPerBox;
    private Double totalAmount;
}
