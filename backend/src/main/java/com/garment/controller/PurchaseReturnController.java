package com.garment.controller;

import java.util.List;
import java.util.stream.Collectors;

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

import com.garment.DTO.PurchaseReturnItemDTO;
import com.garment.DTO.PurchaseReturnRequestDTO;
import com.garment.DTO.PurchaseReturnResponseDTO;
import com.garment.model.PurchaseOrderItem;
import com.garment.repository.PurchaseOrderItemRepository;
import com.garment.service.PurchaseReturnService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/purchase-returns")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class PurchaseReturnController {

    private final PurchaseReturnService purchaseReturnService;
    private final PurchaseOrderItemRepository purchaseOrderItemRepository; // to fetch order items by party

    // Create
    @PostMapping
    public ResponseEntity<?> create(@RequestBody PurchaseReturnRequestDTO dto) {
        var created = purchaseReturnService.createReturn(dto);
        PurchaseReturnResponseDTO response = purchaseReturnService.toResponseDTO(created);
        return ResponseEntity.ok(response);
    }

    // Get all
    @GetMapping
    public ResponseEntity<List<PurchaseReturnResponseDTO>> getAll() {
        return ResponseEntity.ok(purchaseReturnService.getAllReturns());
    }

    // Get by id
    @GetMapping("/{id}")
    public ResponseEntity<PurchaseReturnResponseDTO> getById(@PathVariable Long id) {
        var pr = purchaseReturnService.getReturn(id);
        return ResponseEntity.ok(purchaseReturnService.toResponseDTO(pr));
    }

    // Update
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody PurchaseReturnRequestDTO dto) {
        var updated = purchaseReturnService.updateReturn(id, dto);
        return ResponseEntity.ok(purchaseReturnService.toResponseDTO(updated));
    }

    // Delete
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        purchaseReturnService.deleteReturn(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Template endpoint: When frontend selects Party, call this to get all items
     * from purchase orders for that party so UI can prefill rows (and user can edit them).
     *
     * This uses your existing PurchaseOrderItemRepository.findItemsByPartyId(...) query.
     */
    @GetMapping("/template/{partyId}")
    public ResponseEntity<List<PurchaseReturnItemDTO>> getTemplateByParty(@PathVariable Long partyId) {
        List<PurchaseReturnItemDTO> dtos = purchaseReturnService.getTemplateByParty(partyId);
        return ResponseEntity.ok(dtos);
    }


}
