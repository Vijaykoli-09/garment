package com.garment.DTO;

public class ApproveCustomerRequest {

    private boolean creditEnabled;
    private double creditLimit;
    private boolean advanceOption; // 30% advance + 70% credit

    public boolean isCreditEnabled() { return creditEnabled; }
    public void setCreditEnabled(boolean creditEnabled) { this.creditEnabled = creditEnabled; }

    public double getCreditLimit() { return creditLimit; }
    public void setCreditLimit(double creditLimit) { this.creditLimit = creditLimit; }

    public boolean isAdvanceOption() { return advanceOption; }
    public void setAdvanceOption(boolean advanceOption) { this.advanceOption = advanceOption; }
}