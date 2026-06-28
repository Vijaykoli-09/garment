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

import com.garment.DTO.MaterialPurchaseReturnItemDTO;
import com.garment.DTO.MaterialPurchaseReturnRequestDTO;
import com.garment.DTO.MaterialPurchaseReturnResponseDTO;
import com.garment.service.MaterialPurchaseReturnService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/purchase/return-item")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class MaterialPurchaseReturnController {

    private final MaterialPurchaseReturnService service;

    @PostMapping
    public ResponseEntity<MaterialPurchaseReturnResponseDTO> create(
            @RequestBody MaterialPurchaseReturnRequestDTO dto) {
        var created = service.create(dto);
        return ResponseEntity.ok(service.toResponseDTO(created));
    }

    @GetMapping
    public ResponseEntity<List<MaterialPurchaseReturnResponseDTO>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MaterialPurchaseReturnResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.toResponseDTO(service.get(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MaterialPurchaseReturnResponseDTO> update(
            @PathVariable Long id,
            @RequestBody MaterialPurchaseReturnRequestDTO dto) {
        var updated = service.update(id, dto);
        return ResponseEntity.ok(service.toResponseDTO(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/template/{partyId}")
    public ResponseEntity<List<MaterialPurchaseReturnItemDTO>> getTemplateByParty(@PathVariable Long partyId) {
        return ResponseEntity.ok(service.getTemplateByParty(partyId));
    }
}