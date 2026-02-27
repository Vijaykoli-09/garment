package com.garment.DTO;

import lombok.Data;

@Data
public class PaymentMethodDTO {

    private String entryType;
    private String paymentTo;         // Party or Employee
    private String paymentDate;
    private String serialNo;
    private String processName;
    private String partyName;
    private String employeeName;
    private String paymentThrough;
    private double amount;
    private double balance;
    private String remarks;
    private String date;
}
