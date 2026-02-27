package com.garment.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaleOrderPendencyRowDTO {
    private String destination;   // station
    private Long partyId;
    private String partyName;
    private String artNo;
    private String artName;
    private String size;

    private Integer opening;      // SO before fromDate
    private Integer receipt;      // SO in [fromDate,toDate]
    private Integer dispatch;     // PC in [fromDate,toDate]
    private Integer pending;      // opening + receipt - dispatch
}