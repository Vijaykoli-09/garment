package com.garment.DTO;

public class CustomerLoginResponse {

    private String token;
    private Long id;
    private String fullName;
    private String phone;
    private String email;
    private String customerType;
    private boolean creditEnabled;
    private double creditLimit;
    private boolean advanceOption;

    // Constructor
    public CustomerLoginResponse(String token, Long id, String fullName, String phone,
                                  String email, String customerType,
                                  boolean creditEnabled, double creditLimit, boolean advanceOption) {
        this.token = token;
        this.id = id;
        this.fullName = fullName;
        this.phone = phone;
        this.email = email;
        this.customerType = customerType;
        this.creditEnabled = creditEnabled;
        this.creditLimit = creditLimit;
        this.advanceOption = advanceOption;
    }

    // Getters
    public String getToken() { return token; }
    public Long getId() { return id; }
    public String getFullName() { return fullName; }
    public String getPhone() { return phone; }
    public String getEmail() { return email; }
    public String getCustomerType() { return customerType; }
    public boolean isCreditEnabled() { return creditEnabled; }
    public double getCreditLimit() { return creditLimit; }
    public boolean isAdvanceOption() { return advanceOption; }
}