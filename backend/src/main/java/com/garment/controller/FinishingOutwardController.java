package com.garment.controller;

import com.garment.DTO.FinishingOutwardDTO;
import com.garment.service.FinishingOutwardService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/finishing-outwards")
@CrossOrigin(origins = "http://localhost:3000")
@RequiredArgsConstructor
public class FinishingOutwardController {

    private final FinishingOutwardService finishingOutwardService;

    // 1. GET ALL
    @GetMapping
    public ResponseEntity<List<FinishingOutwardDTO>> getAllOutwards() {
        List<FinishingOutwardDTO> outwards = finishingOutwardService.getAllOutwards();
        return ResponseEntity.ok(outwards);
    }

    // 2. GET BY ID
    @GetMapping("/{id}")
    public ResponseEntity<FinishingOutwardDTO> getOutwardById(@PathVariable Long id) {
        try {
            FinishingOutwardDTO dto = finishingOutwardService.getOutwardById(id);
            return ResponseEntity.ok(dto);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // 3. POST (CREATE)
    @PostMapping
    public ResponseEntity<FinishingOutwardDTO> createOutward(@RequestBody FinishingOutwardDTO dto) {
        // You should add @Valid to the DTO and implement validation logic
        FinishingOutwardDTO createdDto = finishingOutwardService.createOutward(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdDto);
    }

    // 4. PUT (UPDATE)
    @PutMapping("/{id}")
    public ResponseEntity<FinishingOutwardDTO> updateOutward(@PathVariable Long id,
            @RequestBody FinishingOutwardDTO dto) {
        try {
            // Ensure the ID in the DTO matches the path variable for consistency (optional)
            dto.setId(id);
            FinishingOutwardDTO updatedDto = finishingOutwardService.updateOutward(id, dto);
            return ResponseEntity.ok(updatedDto);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // 5. DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteOutward(@PathVariable Long id) {
        try {
            finishingOutwardService.deleteOutward(id);
            return ResponseEntity.noContent().build(); // HTTP 204 No Content
        } catch (EntityNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }
}