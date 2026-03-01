package com.garment.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import lombok.Data;

@Data
public class DispatchChallanDTO {

    private Long id;

    private String serialNo;
    private LocalDate date;      // matches frontend "YYYY-MM-DD"

    private String challanNo;
    private String partyName;
    private String brokerName;
    private String transportName;
    private String dispatchedBy;
    private String station;
    private String remarks1;
    private String remarks2;

    private BigDecimal totalAmt;
    private BigDecimal discount;
    private BigDecimal discountPercent;
    private BigDecimal tax;
    private BigDecimal taxPercent;
    private BigDecimal cartage;
    private BigDecimal netAmt;

    private List<DispatchRowDto> rows;
    private List<DispatchPackingRowDto> packingRows;
}
