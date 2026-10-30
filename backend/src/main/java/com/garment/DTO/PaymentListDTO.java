package com.garment.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentListDTO {
    private Long id;
    private LocalDate paymentDate;
    private String paymentTo;
    private String partyName;
    private String employeeName;
    private String processName;
    private BigDecimal amount;
}
