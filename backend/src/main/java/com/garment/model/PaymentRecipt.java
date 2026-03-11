// src/main/java/com/garment/model/PaymentRecipt.java
package com.garment.model;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.*;

@Entity
@Table(name = "payments")
public class PaymentRecipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="entry_type", length = 50)
    private String entryType;

    // "Party", "Employee", "Other"
    @Column(name="payment_to", length = 20)
    private String paymentTo;

    @Column(name="payment_date")
    private LocalDate paymentDate;

    // frontend "date" -> stored as to_date
    @Column(name="to_date")
    private LocalDate toDate;

    @Column(name="process_name", length = 255)
    private String processName;

    @Column(name="party_name", length = 255)
    private String partyName;

    @Column(name="employee_name", length = 255)
    private String employeeName;

    // "Cash" or "BANK-ACCNO"
    @Column(name="payment_through", length = 255)
    private String paymentThrough;

    // NUMERIC in DB -> BigDecimal here
    @Column(name="amount", precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(name="balance", precision = 18, scale = 2)
    private BigDecimal balance;

    @Column(name="remarks", length = 500)
    private String remarks;

    public PaymentRecipt() {}

    public Long getId() { return id; }
    public String getEntryType() { return entryType; }
    public String getPaymentTo() { return paymentTo; }
    public LocalDate getPaymentDate() { return paymentDate; }
    public LocalDate getToDate() { return toDate; }
    public String getProcessName() { return processName; }
    public String getPartyName() { return partyName; }
    public String getEmployeeName() { return employeeName; }
    public String getPaymentThrough() { return paymentThrough; }
    public BigDecimal getAmount() { return amount; }
    public BigDecimal getBalance() { return balance; }
    public String getRemarks() { return remarks; }

    public void setId(Long id) { this.id = id; }
    public void setEntryType(String entryType) { this.entryType = entryType; }
    public void setPaymentTo(String paymentTo) { this.paymentTo = paymentTo; }
    public void setPaymentDate(LocalDate paymentDate) { this.paymentDate = paymentDate; }
    public void setToDate(LocalDate toDate) { this.toDate = toDate; }
    public void setProcessName(String processName) { this.processName = processName; }
    public void setPartyName(String partyName) { this.partyName = partyName; }
    public void setEmployeeName(String employeeName) { this.employeeName = employeeName; }
    public void setPaymentThrough(String paymentThrough) { this.paymentThrough = paymentThrough; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
}