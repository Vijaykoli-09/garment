package com.garment.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PackingChallanListDTO {
    private String serialNo;
    private LocalDate date;
    private String partyName;
    private Integer totalBox;
    private Integer totalPcs;
    private BigDecimal totalAmount;
}
