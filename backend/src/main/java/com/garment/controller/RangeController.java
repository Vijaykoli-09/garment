package com.garment.controller;

import com.garment.DTO.RangeDTO;
import com.garment.service.RangeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/range")
public class RangeController {

    @Autowired
    private RangeService rangeService;

    @GetMapping("/list")
    public ResponseEntity<List<RangeDTO>> getAllRanges() {
        return ResponseEntity.ok(rangeService.getAllRanges());
    }

    @PostMapping("/save")
    public ResponseEntity<RangeDTO> saveRange(@RequestBody RangeDTO dto) {
        return ResponseEntity.ok(rangeService.saveRange(dto));
    }

    @PutMapping("/update/{serialNumber}")
    public ResponseEntity<RangeDTO> updateRange(@PathVariable String serialNumber, @RequestBody RangeDTO dto) {
        RangeDTO updated = rangeService.updateRange(serialNumber, dto);
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/delete/{serialNumber}")
    public ResponseEntity<Void> deleteRange(@PathVariable String serialNumber) {
        if (rangeService.deleteRange(serialNumber)) {
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
