package com.garment.controller;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.garment.DTO.MaterialStockRequestDTO;
import com.garment.DTO.MaterialStockResponseDTO;
import com.garment.service.MaterialStockService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/stock-report")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class MaterialStockController {

    private final MaterialStockService stockService;

    @PostMapping
    public List<MaterialStockResponseDTO> getStockReport(@RequestBody MaterialStockRequestDTO request) {
        return stockService.getStockReport(request);
    }
}
