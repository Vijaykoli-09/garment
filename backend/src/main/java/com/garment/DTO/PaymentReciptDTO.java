package com.garment.DTO;

import java.time.LocalDate;

public class PaymentReciptDTO {

    private Long id;
    private String entryType;
    private String paymentTo;
    private LocalDate paymentDate;

    
    private LocalDate date;

    private String processName;
    private String partyName;
    private String employeeName;
    private String paymentThrough;
    private String amount;
    private String balance;
    private String remarks;

    public PaymentReciptDTO() {}

    public Long getId() { return id; }
    public String getEntryType() { return entryType; }
    public String getPaymentTo() { return paymentTo; }
    public LocalDate getPaymentDate() { return paymentDate; }
    public LocalDate getDate() { return date; }
    public String getProcessName() { return processName; }
    public String getPartyName() { return partyName; }
    public String getEmployeeName() { return employeeName; }
    public String getPaymentThrough() { return paymentThrough; }
    public String getAmount() { return amount; }
    public String getBalance() { return balance; }
    public String getRemarks() { return remarks; }

    public void setId(Long id) { this.id = id; }
    public void setEntryType(String entryType) { this.entryType = entryType; }
    public void setPaymentTo(String paymentTo) { this.paymentTo = paymentTo; }
    public void setPaymentDate(LocalDate paymentDate) { this.paymentDate = paymentDate; }
    public void setDate(LocalDate date) { this.date = date; }
    public void setProcessName(String processName) { this.processName = processName; }
    public void setPartyName(String partyName) { this.partyName = partyName; }
    public void setEmployeeName(String employeeName) { this.employeeName = employeeName; }
    public void setPaymentThrough(String paymentThrough) { this.paymentThrough = paymentThrough; }
    public void setAmount(String amount) { this.amount = amount; }
    public void setBalance(String balance) { this.balance = balance; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
}