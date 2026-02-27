package com.garment.controller;

import java.util.List;


import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.garment.DTO.PurchaseOrderRequestDTO;
import com.garment.DTO.PurchaseOrderResponseDTO;
//import com.garment.DTO.PurchasePendingOrdersDTO;
import com.garment.model.PurchaseOrder;
import com.garment.service.PurchaseOrderService;
import com.garment.serviceImpl.PurchaseOrderServiceImpl;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/purchase-orders")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class PurchaseOrderController {
	private final PurchaseOrderService service;

    // Create Purchase Order
    @PostMapping
    public ResponseEntity<PurchaseOrder> create(@RequestBody PurchaseOrderRequestDTO dto) {
        PurchaseOrder createdOrder = service.createOrder(dto);
        return ResponseEntity.ok(createdOrder);
    }

 // Get Purchase Order by ID
    @GetMapping("/{id}")
    public ResponseEntity<PurchaseOrderResponseDTO> get(@PathVariable Long id) {
        PurchaseOrder order = service.getOrder(id);

        // ✅ Convert entity to DTO response
        if (service instanceof PurchaseOrderServiceImpl impl) {
            PurchaseOrderResponseDTO response = impl.getAllOrderResponses().stream()
                .filter(o -> o.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Order not found"));
            return ResponseEntity.ok(response);
        }

        throw new RuntimeException("ServiceImpl not found");
    }

    // ✅ Get All Purchase Orders (Response DTO version)
    @GetMapping
    public ResponseEntity<List<PurchaseOrderResponseDTO>> getAll() {
        if (service instanceof PurchaseOrderServiceImpl impl) {
            List<PurchaseOrderResponseDTO> orders = impl.getAllOrderResponses();
            return ResponseEntity.ok(orders);
        }
        throw new RuntimeException("ServiceImpl not found");
    }

    // Update Purchase Order
    @PutMapping("/{id}")
    public ResponseEntity<PurchaseOrder> update(@PathVariable Long id, @RequestBody PurchaseOrderRequestDTO dto) {
        PurchaseOrder updatedOrder = service.updateOrder(id, dto);
        return ResponseEntity.ok(updatedOrder);
    }

    // Delete Purchase Order
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.deleteOrder(id);
        return ResponseEntity.noContent().build();
    }

    // Issue Purchase Order to Purchase Entity Module
    @PostMapping("/{id}/issue")
    public ResponseEntity<Void> issueToPurchaseEntity(@PathVariable Long id) {
        service.issueToPurchaseEntity(id);
        return ResponseEntity.ok().build();
    }
    
    //For Pending ORder logic
//    @GetMapping("/pending")
//    public ResponseEntity<List<PurchasePendingOrdersDTO>> getPendingOrders() {
//        if (service instanceof PurchaseOrderServiceImpl impl) {
//            return ResponseEntity.ok(impl.getPendingOrders());
//        }
//        throw new RuntimeException("ServiceImpl not found");
//    }

}
