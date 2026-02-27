package com.garment.controller;

import com.garment.DTO.FabricationDTO;
import com.garment.model.Fabrication;
import com.garment.serviceImpl.FabricationServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/fabrication")
@CrossOrigin(origins = "http://localhost:3000")
public class FabricationController {

    @Autowired
    private FabricationServiceImpl fabricationService;

    @PostMapping
    public ResponseEntity<Fabrication> create(@RequestBody FabricationDTO dto) {
        return ResponseEntity.ok(fabricationService.createFabrication(dto));
    }

    @PutMapping("/{serialNo}")
    public ResponseEntity<Fabrication> update(@PathVariable String serialNo, @RequestBody FabricationDTO dto) {
        return ResponseEntity.ok(fabricationService.updateFabrication(serialNo, dto));
    }

    @DeleteMapping("/{serialNo}")
    public ResponseEntity<String> delete(@PathVariable String serialNo) {
        fabricationService.deleteFabrication(serialNo);
        return ResponseEntity.ok("Deleted Successfully");
    }

    @GetMapping
    public ResponseEntity<List<FabricationDTO>> getAll() {
        return ResponseEntity.ok(fabricationService.getAllFabricationDTOs());
    }

    @GetMapping("/{serialNo}")
    public ResponseEntity<Fabrication> getById(@PathVariable String serialNo) {
        return ResponseEntity.ok(fabricationService.getFabricationBySerialNo(serialNo));
    }
}
