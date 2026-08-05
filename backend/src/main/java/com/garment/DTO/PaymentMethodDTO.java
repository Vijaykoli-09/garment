package com.garment.DTO;

import lombok.Data;

@Data
public class PaymentMethodDTO {
    private String paymentTo;          // Party / Employee / Other
    private String paymentDate;
    private String serialNo;
    private String processName;
    private String partyName;
    private String employeeName;
    private String paymentThrough;

    // ✅ CASH
    private double amount;

    // ✅ DISCOUNT
    private double discountAmount;

    private double balance;
    private String remarks;
    private String date;
}