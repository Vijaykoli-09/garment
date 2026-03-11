package com.garment.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "payment_modes")
public class PaymentMode {

   
    public enum OpeningBalanceType { CR, DR }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bank_name_or_upi_id", nullable = false, length = 255)
    private String bankNameOrUpiId;

    @Column(name = "account_no", nullable = false, length = 255)
    private String accountNo;

    @Column(name = "opening_balance", nullable = false)
    private Double openingBalance;

    @Enumerated(EnumType.STRING)
    @Column(name = "opening_balance_type", nullable = false, length = 2)
    private OpeningBalanceType openingBalanceType;

    public PaymentMode() {}

    public Long getId() { return id; }
    public String getBankNameOrUpiId() { return bankNameOrUpiId; }
    public String getAccountNo() { return accountNo; }
    public Double getOpeningBalance() { return openingBalance; }
    public OpeningBalanceType getOpeningBalanceType() { return openingBalanceType; }

    public void setId(Long id) { this.id = id; }
    public void setBankNameOrUpiId(String bankNameOrUpiId) { this.bankNameOrUpiId = bankNameOrUpiId; }
    public void setAccountNo(String accountNo) { this.accountNo = accountNo; }
    public void setOpeningBalance(Double openingBalance) { this.openingBalance = openingBalance; }
    public void setOpeningBalanceType(OpeningBalanceType openingBalanceType) { this.openingBalanceType = openingBalanceType; }
}