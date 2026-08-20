package com.garment.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import lombok.Data;

@Data
public class DispatchReturnChallanDTO {

    private Long id;

    private String serialNo;
    private LocalDate date;

    private String challanNo;
    private String partyName;
    private String brokerName;
    private String transportName;
    private String dispatchedBy;
    private String station;
    private String remarks1;
    private String remarks2;

    private Integer challanYear;
    private Integer challanSeq;
    private Integer serialYear;
    private Integer serialSeq;

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
