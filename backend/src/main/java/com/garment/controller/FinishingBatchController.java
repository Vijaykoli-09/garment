package com.garment.controller;

import com.garment.DTO.FinishingBatchDTO;
import com.garment.service.FinishingBatchService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/finishing-batch")
@CrossOrigin(origins = "http://localhost:3000")
public class FinishingBatchController {
    private final FinishingBatchService service;
    public FinishingBatchController(FinishingBatchService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody FinishingBatchDTO dto) {
        try { return ResponseEntity.status(HttpStatus.CREATED).body(service.save(dto)); }
        catch (IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("message", e.getMessage())); }
        catch (Exception e) { e.printStackTrace(); return ResponseEntity.status(500).body(Map.of("message", "Failed to create Finishing Batch")); }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody FinishingBatchDTO dto) {
        try { return ResponseEntity.ok(service.update(id, dto)); }
        catch (EntityNotFoundException e) { return ResponseEntity.status(404).body(Map.of("message", e.getMessage())); }
        catch (IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("message", e.getMessage())); }
        catch (Exception e) { e.printStackTrace(); return ResponseEntity.status(500).body(Map.of("message", "Failed to update Finishing Batch")); }
    }

    @GetMapping
    public ResponseEntity<?> getAll() {
        try { List<FinishingBatchDTO> result = service.findAll(); return ResponseEntity.ok(result); }
        catch (Exception e) { e.printStackTrace(); return ResponseEntity.status(500).body(Map.of("message", "Failed to load Finishing Batches")); }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        try { return ResponseEntity.ok(service.findById(id)); }
        catch (EntityNotFoundException e) { return ResponseEntity.status(404).body(Map.of("message", e.getMessage())); }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try { service.delete(id); return ResponseEntity.ok(Map.of("message", "Finishing Batch deleted successfully")); }
        catch (EntityNotFoundException e) { return ResponseEntity.status(404).body(Map.of("message", e.getMessage())); }
        catch (Exception e) { e.printStackTrace(); return ResponseEntity.status(500).body(Map.of("message", "Failed to delete Finishing Batch")); }
    }
}
