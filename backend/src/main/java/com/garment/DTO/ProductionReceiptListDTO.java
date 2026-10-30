package com.garment.DTO;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductionReceiptListDTO {
    private Long id;
    private String voucherNo;
    private String dated;
    private String employeeName;
    private String processName;
    private String lotArtPairs;
    private BigDecimal totalPcs;
}
