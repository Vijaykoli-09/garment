package com.garment.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.garment.DTO.FinishingAmountStatementDTO;
import com.garment.service.FinishingAmountStatementService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/finishing-amount-statement")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class FinishingAmountStatementController {

    private final FinishingAmountStatementService finishingAmountStatementService;

    // 🔹 Create new Amount Statement
    @PostMapping
    public ResponseEntity<FinishingAmountStatementDTO> createStatement(
            @RequestBody FinishingAmountStatementDTO dto) {
        FinishingAmountStatementDTO savedStatement = finishingAmountStatementService.createStatement(dto);
        return ResponseEntity.ok(savedStatement);
    }

    // 🔹 Get All Statements
    @GetMapping
    public ResponseEntity<List<FinishingAmountStatementDTO>> getAllStatements() {
        List<FinishingAmountStatementDTO> list = finishingAmountStatementService.getAllStatements();
        return ResponseEntity.ok(list);
    }

    // 🔹 Get Statement by ID
    @GetMapping("/{id}")
    public ResponseEntity<FinishingAmountStatementDTO> getStatementById(@PathVariable Long id) {
        FinishingAmountStatementDTO dto = finishingAmountStatementService.getStatementById(id);
        return ResponseEntity.ok(dto);
    }

    // 🔹 Delete Statement
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteStatement(@PathVariable Long id) {
        finishingAmountStatementService.deleteStatement(id);
        return ResponseEntity.ok("Statement deleted successfully with ID: " + id);
    }
}
