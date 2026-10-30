package com.garment.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DispatchChallanListDTO {
    private Long id;
    private String serialNo;
    private LocalDate date;
    private String challanNo;
    private String partyName;
    private String station;
    private BigDecimal netAmt;
    private String artNos;
    private String artNo;
    private String size;
    private String shade;
    private Integer box;
    private Integer pcsPerBox;
    private Integer pcs;
    private BigDecimal rate;
    private BigDecimal amt;
}
