package com.garment.controller;

import com.garment.DTO.SizeStockTransferRequest;
import com.garment.DTO.SizeStockTransferResponse;
import com.garment.service.SizeStockTransferService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/size-stock-transfers")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class SizeStockTransferController {

    private final SizeStockTransferService service;

    @PostMapping
    public ResponseEntity<?> create(@RequestBody SizeStockTransferRequest req) {
        try {
            SizeStockTransferResponse resp = service.create(req);
            return ResponseEntity.status(HttpStatus.CREATED).body(resp);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        } catch (Exception ex) {
            return ResponseEntity.status(500).body("Save failed: " + ex.getMessage());
        }
    }
}