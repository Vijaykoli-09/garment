// src/main/java/com/garment/DTO/PaymentReciptDTO.java
package com.garment.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;

public class PaymentReciptDTO {

    private Long id;
    private String entryType;

    // "Party", "Employee", "Broker", "Other"
    private String receiptTo;

    private LocalDate receiptDate; // From Date
    private LocalDate date;        // To Date

    private String processName;
    private String partyName;
    private String employeeName;
    private String paymentThrough;

    // CASH only
    private BigDecimal amount;

    // Discount amount (credit)
    private BigDecimal discountAmount;

    // Stored balance after this receipt (+ Dr, - Cr) - legacy usage
    private BigDecimal balance;

    private String remarks;
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

    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }

    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public String getAgentName() { return agentName; }
    public void setAgentName(String agentName) { this.agentName = agentName; }
}