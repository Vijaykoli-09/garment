package com.garment.controller;

import com.garment.DTO.SelfTransferDTO;
import com.garment.service.SelfTransferService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/self-transfer")
public class SelfTransferController {
    private final SelfTransferService service;
    public SelfTransferController(SelfTransferService service) { this.service = service; }

    @GetMapping
    public ResponseEntity<List<SelfTransferDTO>> getAll() {
        return ResponseEntity.ok(service.getAllTransfers());
    }
    @PostMapping
    public ResponseEntity<?> create(@RequestBody SelfTransferDTO dto) {
        try { return ResponseEntity.status(HttpStatus.CREATED).body(service.createTransfer(dto)); }
        catch (IllegalArgumentException ex) { return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage())); }
    }
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody SelfTransferDTO dto) {
        try { return ResponseEntity.ok(service.updateTransfer(id, dto)); }
        catch (IllegalArgumentException ex) { return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage())); }
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try { service.deleteTransfer(id); return ResponseEntity.noContent().build(); }
        catch (IllegalArgumentException ex) { return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage())); }
    }
}
