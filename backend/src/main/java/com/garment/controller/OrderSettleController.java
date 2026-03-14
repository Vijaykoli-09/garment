package com.garment.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.garment.DTO.OrderSettleDTO;
import com.garment.service.OrderSettleService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/order-settles")    // IMPORTANT: must NOT be "/api/sale-orders"
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class OrderSettleController {

    private final OrderSettleService svc;

    @GetMapping
    public List<OrderSettleDTO> list() {
        return svc.list();
    }

    @GetMapping("/{id}")
    public OrderSettleDTO get(@PathVariable Long id) {
        return svc.get(id);
    }

    @PostMapping
    public OrderSettleDTO create(@RequestBody OrderSettleDTO dto) {
        return svc.create(dto);
    }

    @PutMapping("/{id}")
    public OrderSettleDTO update(@PathVariable Long id, @RequestBody OrderSettleDTO dto) {
        return svc.update(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        svc.delete(id);
        return ResponseEntity.noContent().build();
    }
}