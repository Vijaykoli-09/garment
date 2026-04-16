package com.garment.DTO;

/**
 * Used by the Edit modal to change status + payment config in one call.
 * POST /api/admin/customers/{id}/update
 */
public class UpdateCustomerRequest {

    private String status;          // "APPROVED" or "REJECTED"
    private boolean creditEnabled;
    private double creditLimit;
    private boolean advanceOption;

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isCreditEnabled() { return creditEnabled; }
    public void setCreditEnabled(boolean creditEnabled) { this.creditEnabled = creditEnabled; }

    public double getCreditLimit() { return creditLimit; }
    public void setCreditLimit(double creditLimit) { this.creditLimit = creditLimit; }

    public boolean isAdvanceOption() { return advanceOption; }
    public void setAdvanceOption(boolean advanceOption) { this.advanceOption = advanceOption; }
}