package com.garment.controller;


import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.garment.DTO.MaterialPurchaseOrderRequestDto;
import com.garment.DTO.MaterialPurchaseOrderResponseDto;
import com.garment.service.MaterialPurchaseOrderService;

@RestController
@RequestMapping("/api/purchase/order-item")
// @CrossOrigin(origins = "http://localhost:3000")
public class MaterialPurchaseOrderController {

    private final MaterialPurchaseOrderService service;

    public MaterialPurchaseOrderController(MaterialPurchaseOrderService service) {
        this.service = service;
    }

    // matches frontend: GET /api/purchase/order-item/next-order-no
    @GetMapping("/next-order-no")
    public String nextOrderNo() {
        return service.getNextOrderNo();
    }

    // matches frontend: POST /api/purchase/order-item
    @PostMapping
    public MaterialPurchaseOrderResponseDto create(@RequestBody MaterialPurchaseOrderRequestDto dto) {
        return service.create(dto);
    }

    // matches frontend: PUT /api/purchase/order-item/{id}
    @PutMapping("/{id}")
    public MaterialPurchaseOrderResponseDto update(
            @PathVariable Long id,
            @RequestBody MaterialPurchaseOrderRequestDto dto
    ) {
        return service.update(id, dto);
    }

    // matches frontend: GET /api/purchase/order-item
    @GetMapping
    public List<MaterialPurchaseOrderResponseDto> getAll() {
        return service.getAll();
    }

    // matches frontend: DELETE /api/purchase/order-item/{id}
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}