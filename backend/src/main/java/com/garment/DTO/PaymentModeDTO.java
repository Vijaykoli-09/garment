package com.garment.DTO;

import jakarta.validation.constraints.NotBlank;

public class PaymentModeDTO {

    private Long id;

    @NotBlank(message = "Bank name or UPI ID is required")
    private String bankNameOrUpiId;

    @NotBlank(message = "Account number is required")
    private String accountNo;

    public PaymentModeDTO() {
    }

    public Long getId() {
        return id;
    }

    public String getBankNameOrUpiId() {
        return bankNameOrUpiId;
    }

    public String getAccountNo() {
        return accountNo;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setBankNameOrUpiId(String bankNameOrUpiId) {
        this.bankNameOrUpiId = bankNameOrUpiId;
    }

    public void setAccountNo(String accountNo) {
        this.accountNo = accountNo;
    }
}