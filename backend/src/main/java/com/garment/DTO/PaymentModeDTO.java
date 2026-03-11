package com.garment.DTO;

import com.garment.model.PaymentMode;

import jakarta.validation.constraints.NotBlank;

public class PaymentModeDTO {

    private Long id;

    @NotBlank(message = "Bank name or UPI ID is required")
    private String bankNameOrUpiId;

    @NotBlank(message = "Account number is required")
    private String accountNo;

    
    private Double openingBalance;

    
    private PaymentMode.OpeningBalanceType openingBalanceType;

    public PaymentModeDTO() {}

    public Long getId() { return id; }
    public String getBankNameOrUpiId() { return bankNameOrUpiId; }
    public String getAccountNo() { return accountNo; }
    public Double getOpeningBalance() { return openingBalance; }
    public PaymentMode.OpeningBalanceType getOpeningBalanceType() { return openingBalanceType; }

    public void setId(Long id) { this.id = id; }
    public void setBankNameOrUpiId(String bankNameOrUpiId) { this.bankNameOrUpiId = bankNameOrUpiId; }
    public void setAccountNo(String accountNo) { this.accountNo = accountNo; }
    public void setOpeningBalance(Double openingBalance) { this.openingBalance = openingBalance; }
    public void setOpeningBalanceType(PaymentMode.OpeningBalanceType openingBalanceType) { this.openingBalanceType = openingBalanceType; }
}