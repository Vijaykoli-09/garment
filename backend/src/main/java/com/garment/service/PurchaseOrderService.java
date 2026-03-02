package com.garment.service;

import java.util.List;

import com.garment.DTO.PurchaseOrderRequestDTO;
import com.garment.model.PurchaseOrder;

public interface PurchaseOrderService {
    PurchaseOrder createOrder(PurchaseOrderRequestDTO dto);
    PurchaseOrder getOrder(Long id);
    List<PurchaseOrder> getAllOrders();
    PurchaseOrder updateOrder(Long id, PurchaseOrderRequestDTO dto);
    void deleteOrder(Long id);
    void issueToPurchaseEntity(Long orderId);

    // 🔹 NEW: Frontend yeh call karke next order no le sakta hai
    String generateNextOrderNo();
}