package com.garment.DTO;

public class ApproveCustomerRequest {

    private String customerType;   // set by admin: "Wholesaler" | "Semi_Wholesaler" | "Retailer"
    private boolean creditEnabled;
    private double creditLimit;
    private boolean advanceOption;

    public String getCustomerType() { return customerType; }
    public void setCustomerType(String customerType) { this.customerType = customerType; }

    public boolean isCreditEnabled() { return creditEnabled; }
    public void setCreditEnabled(boolean creditEnabled) { this.creditEnabled = creditEnabled; }

    public double getCreditLimit() { return creditLimit; }
    public void setCreditLimit(double creditLimit) { this.creditLimit = creditLimit; }

    public boolean isAdvanceOption() { return advanceOption; }
    public void setAdvanceOption(boolean advanceOption) { this.advanceOption = advanceOption; }
}