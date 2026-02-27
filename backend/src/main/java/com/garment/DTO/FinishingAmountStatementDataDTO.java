package com.garment.DTO;

import java.time.LocalDate;
import lombok.Data;

@Data
public class FinishingAmountStatementDataDTO {
    private Long id;
    private LocalDate date;
    private String narration;
    private Double debit;
    private Double credit;
    private Double balance;
    private String type;
}
