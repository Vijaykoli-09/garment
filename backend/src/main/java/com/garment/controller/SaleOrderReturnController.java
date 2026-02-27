package com.garment.controller;

import com.garment.model.SaleOrderReturn;
import com.garment.service.SaleOrderReturnService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sale-order-returns")
@CrossOrigin(origins = "http://localhost:3000")
public class SaleOrderReturnController {

    @Autowired
    private SaleOrderReturnService service;

    @GetMapping
    public ResponseEntity<List<SaleOrderReturn>> getAllReturns() {
        return ResponseEntity.ok(service.getAllReturns());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SaleOrderReturn> getReturnById(@PathVariable Long id) {
        return service.getReturnById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/next-no")
    public ResponseEntity<String> getNextReturnNo() {
        return ResponseEntity.ok(service.generateNextReturnNo());
    }

    @PostMapping
    public ResponseEntity<SaleOrderReturn> createReturn(@RequestBody SaleOrderReturn saleOrderReturn) {
        return ResponseEntity.ok(service.createReturn(saleOrderReturn));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SaleOrderReturn> updateReturn(@PathVariable Long id, @RequestBody SaleOrderReturn saleOrderReturn) {
        SaleOrderReturn updated = service.updateReturn(id, saleOrderReturn);
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReturn(@PathVariable Long id) {
        service.deleteReturn(id);
        return ResponseEntity.noContent().build();
    }
}