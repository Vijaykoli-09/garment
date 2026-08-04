package com.garment.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import lombok.Data;

@Data
public class DispatchReturnChallanResponseDTO {
    private Long id;

    private String serialNo;
    private String challanNo;

    private LocalDate date;

    private String partyName;
    private String brokerName;
    private String transportName;
    private String dispatchedBy;
    private String remarks1;
    private String remarks2;
    private String station;

    private BigDecimal totalAmt;
    private BigDecimal discount;
    private BigDecimal discountPercent;
    private BigDecimal tax;
    private BigDecimal taxPercent;
    private BigDecimal cartage;
    private BigDecimal netAmt;

    private List<DispatchReturnRowDTO> rows;
    private List<DispatchReturnPackingRowDTO> packingRows;
}