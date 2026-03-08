package com.garment.DTO;

import java.util.List;

public class AppRazorpayOrderRequest {

    private List<AppOrderItemRequest> items;
    private String paymentMethod;   // UPI | BANK_TRANSFER | DEBIT_CARD | CREDIT_CARD | CREDIT_ORDER | ADVANCE_CREDIT
    private String deliveryAddress;

    public List<AppOrderItemRequest> getItems() { return items; }
    public void setItems(List<AppOrderItemRequest> items) { this.items = items; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }
}