package com.garment.DTO;


import java.time.LocalDate;
import lombok.Data;

@Data
public class FinishingStockStatementDataDTO {
    private Long id;
    private LocalDate date;
    private String narration;
    private Double issuePcs;
    private Double issueKgs;
    private Double receiptPcs;
    private Double receiptKgs;
    private Double receiptWastage;
    private Double receiptRate;
    private Double receiptAmount;
    private Double balancePcs;
    private Double balanceKgs;
}
