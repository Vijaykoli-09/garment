package com.garment.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentReciptListDTO {
    private Long id;
    private String entryType;
    private String receiptTo;
    private LocalDate receiptDate;
    private LocalDate date;
    private String processName;
    private String partyName;
    private String employeeName;
    private String agentName;
    private BigDecimal amount;
    private BigDecimal discountAmount;
    private BigDecimal balance;
}
