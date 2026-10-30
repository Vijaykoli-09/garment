package com.garment.DTO;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MaterialPurchaseEntryListDTO {
    private Long id;
    private String challanNo;
    private String date;
    private String partyName;
    private String materialNames;
    private BigDecimal totalQuantity;
    private BigDecimal totalAmount;
}
