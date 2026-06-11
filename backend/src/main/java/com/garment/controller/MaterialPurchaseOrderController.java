package com.garment.controller;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
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
@RequestMapping("/api/purchase/orders")
@CrossOrigin(originPatterns = "*")
public class MaterialPurchaseOrderController {

    private final MaterialPurchaseOrderService service;

    public MaterialPurchaseOrderController(MaterialPurchaseOrderService service) {
        this.service = service;
    }

    @GetMapping("/next-order-no")
    public String nextOrderNo() {
        return service.getNextOrderNo();
    }

    @PostMapping
    public MaterialPurchaseOrderResponseDto create(
            @RequestBody MaterialPurchaseOrderRequestDto dto) {
        return service.create(dto);
    }

    @PutMapping("/{id}")
    public MaterialPurchaseOrderResponseDto update(
            @PathVariable Long id,
            @RequestBody MaterialPurchaseOrderRequestDto dto) {

        return service.update(id, dto);
    }

    @GetMapping
    public List<MaterialPurchaseOrderResponseDto> getAll() {
        return service.getAll();
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}