// src/main/java/com/garment/DTO/PaymentReciptDTO.java
package com.garment.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;

public class PaymentReciptDTO {

    private Long id;

    private String entryType;

    // "Party", "Employee", "Other"
    private String receiptTo;

    // From Date
    private LocalDate receiptDate;

    // To Date
    private LocalDate date;

    private String processName;

    private String partyName;

    private String employeeName;

    private String paymentThrough;

    private BigDecimal amount;

    private BigDecimal balance;

    private String remarks;

    // agentName is used in React but not stored in DB here.
    // You can add it + column if you want to persist it.
    private String agentName;

    public PaymentReciptDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEntryType() { return entryType; }
    public void setEntryType(String entryType) { this.entryType = entryType; }

    public String getReceiptTo() { return receiptTo; }
    public void setReceiptTo(String receiptTo) { this.receiptTo = receiptTo; }

    public LocalDate getReceiptDate() { return receiptDate; }
    public void setReceiptDate(LocalDate receiptDate) { this.receiptDate = receiptDate; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getProcessName() { return processName; }
    public void setProcessName(String processName) { this.processName = processName; }

    public String getPartyName() { return partyName; }
    public void setPartyName(String partyName) { this.partyName = partyName; }

    public String getEmployeeName() { return employeeName; }
    public void setEmployeeName(String employeeName) { this.employeeName = employeeName; }

    public String getPaymentThrough() { return paymentThrough; }
    public void setPaymentThrough(String paymentThrough) { this.paymentThrough = paymentThrough; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public String getAgentName() { return agentName; }
    public void setAgentName(String agentName) { this.agentName = agentName; }
}