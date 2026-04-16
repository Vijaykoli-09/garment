package com.garment.DTO;

public class AppVerifyCreditPaymentRequest {

    private Long   orderId;
    private String razorpayOrderId;
    private String razorpayPaymentId;
    private String razorpaySignature;

    public Long   getOrderId()            { return orderId; }
    public void   setOrderId(Long v)      { this.orderId = v; }

    public String getRazorpayOrderId()             { return razorpayOrderId; }
    public void   setRazorpayOrderId(String v)     { this.razorpayOrderId = v; }

    public String getRazorpayPaymentId()           { return razorpayPaymentId; }
    public void   setRazorpayPaymentId(String v)   { this.razorpayPaymentId = v; }

    public String getRazorpaySignature()           { return razorpaySignature; }
    public void   setRazorpaySignature(String v)   { this.razorpaySignature = v; }
}