package com.garment.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaleOrderPendencyRowDTO {

    private String destination;   // station name (UPPER)
    private Long   partyId;
    private String partyName;

    private String artNo;
    private String artName;

    private String shade;         // NEW: shade name or code

    private String size;          // base size (e.g. "M", "L", "XL")

    private Integer opening;
    private Integer receipt;
    private Integer dispatch;
    private Integer pending;
}