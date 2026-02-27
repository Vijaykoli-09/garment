package com.garment.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)   // extra fields ignore
public class OtherDispatchChallanDTO {

    private Long id;

    private String serialNo;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;      // matches frontend "YYYY-MM-DD"

    private String challanNo;    // auto: YYYY/0001

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

    private List<OtherDispatchRowDto> rows;
}