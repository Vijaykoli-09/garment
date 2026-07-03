package com.garment.DTO;

import java.util.List;
import lombok.Data;

@Data
public class MaterialPurchaseEntryDTO {

    // Expected as "yyyy-MM-dd"
    private String date;

    private Long partyId;

    private String challanNo;

    // REQUEST items
    private List<MaterialPurchaseItemDTO> items;
}