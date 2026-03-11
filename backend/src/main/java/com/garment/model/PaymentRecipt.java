package com.garment.model;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "payments")
public class PaymentRecipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="entry_type", length = 50)
    private String entryType;

    // store exactly like frontend: "Party", "Employee", "Other"
    @Column(name="payment_to", length = 20)
    private String paymentTo;

    @Column(name="payment_date")
    private LocalDate paymentDate;

    // frontend sends field name "date" (we store it as to_date column)
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

    // keeping as String to avoid JSON parsing issues ("", "0", "1000")
    @Column(name="amount", length = 50)
    private String amount;

    @Column(name="balance", length = 50)
    private String balance;

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
    public String getAmount() { return amount; }
    public String getBalance() { return balance; }
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
    public void setAmount(String amount) { this.amount = amount; }
    public void setBalance(String balance) { this.balance = balance; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
}