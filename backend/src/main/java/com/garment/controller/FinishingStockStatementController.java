package com.garment.controller;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.garment.DTO.FinishingStockStatementDTO;
import com.garment.service.FinishingStockStatementService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/finishing-stock-statement")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class FinishingStockStatementController {

    private final FinishingStockStatementService finishingStockService;

    @PostMapping
    public ResponseEntity<FinishingStockStatementDTO> create(@RequestBody FinishingStockStatementDTO dto) {
        return ResponseEntity.ok(finishingStockService.createStatement(dto));
    }
    

    @GetMapping
    public ResponseEntity<List<FinishingStockStatementDTO>> getAll() {
        return ResponseEntity.ok(finishingStockService.getAllStatements());
    }

    @GetMapping("/{id}")
    public ResponseEntity<FinishingStockStatementDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(finishingStockService.getStatementById(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(@PathVariable Long id) {
        finishingStockService.deleteStatement(id);
        return ResponseEntity.ok("Deleted successfully with ID: " + id);

    }

}