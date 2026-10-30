package com.garment.controller;

import com.garment.DTO.ProductionReceiptDto;
import com.garment.DTO.ProductionReceiptConsumptionDTO;
import com.garment.DTO.ProductionReceiptListDTO;
import com.garment.DTO.ProductionReceiptResponseDto;
import com.garment.DTO.PagedResponse;
import com.garment.service.ProductionReceiptService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin(origins = "http://localhost:3000")
@RequestMapping("/api/production-receipt")
public class ProductionReceiptController {

    private final ProductionReceiptService service;

    public ProductionReceiptController(ProductionReceiptService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<ProductionReceiptResponseDto>> list() {
        return ResponseEntity.ok(service.listAll());
    }

    @GetMapping("/paged")
    public PagedResponse<ProductionReceiptListDTO> listPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search
    ) {
        return service.listPaged(page, size, search);
    }

    @GetMapping("/consumption")
    public List<ProductionReceiptConsumptionDTO> getConsumption(
            @RequestParam String processName,
            @RequestParam(required = false) Long excludeReceiptId
    ) {
        return service.getConsumption(processName, excludeReceiptId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductionReceiptResponseDto> get(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<ProductionReceiptResponseDto> create(@RequestBody ProductionReceiptDto dto) {
        ProductionReceiptResponseDto created = service.create(dto);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductionReceiptResponseDto> update(@PathVariable Long id, @RequestBody ProductionReceiptDto dto) {
        ProductionReceiptResponseDto updated = service.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.softDelete(id);
        return ResponseEntity.noContent().build();
    }
}
