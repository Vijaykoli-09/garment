package com.garment.controller;

import com.garment.DTO.FinishingInwardDTO;
import com.garment.service.FinishingInwardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/finishing-inwards")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class FinishingInwardController {

    private final FinishingInwardService finishingInwardService;

    // Create
    @PostMapping
    public ResponseEntity<FinishingInwardDTO> createFinishingInward(@RequestBody FinishingInwardDTO dto) {
        FinishingInwardDTO saved = finishingInwardService.createFinishingInward(dto);
        return ResponseEntity.ok(saved);
    }

    // Update
    @PutMapping("/{id}")
    public ResponseEntity<FinishingInwardDTO> updateFinishingInward(@PathVariable Long id,
            @RequestBody FinishingInwardDTO dto) {
        FinishingInwardDTO updated = finishingInwardService.updateFinishingInward(id, dto);
        return ResponseEntity.ok(updated);
    }
    // Get all
    @GetMapping
    public ResponseEntity<List<FinishingInwardDTO>> getAllFinishingInwards() {
        return ResponseEntity.ok(finishingInwardService.getAllFinishingInwards());
    }

    // Get by ID
    @GetMapping("/{id}")
    public ResponseEntity<FinishingInwardDTO> getFinishingInwardById(@PathVariable Long id) {
        FinishingInwardDTO dto = finishingInwardService.getFinishingInwardById(id);
        if (dto != null)
            return ResponseEntity.ok(dto);
        else
            return ResponseEntity.notFound().build();
    }

    // Delete
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFinishingInward(@PathVariable Long id) {
        finishingInwardService.deleteFinishingInward(id);
        return ResponseEntity.noContent().build();
    }
}
