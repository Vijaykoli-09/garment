package com.garment.DTO;

import java.util.List;

public class AppSignupRequest {

    private String fullName;
    private String email;
    private String phone;

    // ── NEW: additional phone numbers the party wants to log in with ──
    // Optional — frontend sends [] or omits it if user adds none.
    private List<String> extraPhoneNumbers;

    private String password;
    private String customerType;   // "Wholesaler" | "Semi-Wholesaler" | "Retailer"
    private String deliveryAddress;
    private String gstNo;
    private String brokerName;
    private String brokerPhone;

    // Getters & Setters
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public List<String> getExtraPhoneNumbers() { return extraPhoneNumbers; }
    public void setExtraPhoneNumbers(List<String> extraPhoneNumbers) { this.extraPhoneNumbers = extraPhoneNumbers; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getCustomerType() { return customerType; }
    public void setCustomerType(String customerType) { this.customerType = customerType; }

    public String getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }

    public String getGstNo() { return gstNo; }
    public void setGstNo(String gstNo) { this.gstNo = gstNo; }

    public String getBrokerName() { return brokerName; }
    public void setBrokerName(String brokerName) { this.brokerName = brokerName; }

    public String getBrokerPhone() { return brokerPhone; }
    public void setBrokerPhone(String brokerPhone) { this.brokerPhone = brokerPhone; }
}