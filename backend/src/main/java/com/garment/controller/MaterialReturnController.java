package com.garment.controller;

import com.garment.DTO.MaterialReturnDTO;
import com.garment.model.MaterialReturn;
import com.garment.service.MaterialReturnService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/material-return")
@CrossOrigin(origins = "http://localhost:3000")
public class MaterialReturnController {

    private final MaterialReturnService service;

    public MaterialReturnController(MaterialReturnService service) {
        this.service = service;
    }

    @PostMapping("/save")
    public ResponseEntity<MaterialReturn> save(@RequestBody MaterialReturnDTO dto) {
        MaterialReturn saved = service.save(dto);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<MaterialReturn> update(@PathVariable Long id, @RequestBody MaterialReturnDTO dto) {
        MaterialReturn updated = service.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/list")
    public ResponseEntity<List<MaterialReturn>> list() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MaterialReturn> getById(@PathVariable Long id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
