package com.garment.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.garment.DTO.DispatchReturnChallanRequestDTO;
import com.garment.DTO.DispatchReturnChallanResponseDTO;
import com.garment.service.DispatchReturnChallanService;

@RestController
@RequestMapping("/api/dispatch-return-challan")
@CrossOrigin(origins = "*")
public class DispatchReturnChallanController {

    private final DispatchReturnChallanService service;

    public DispatchReturnChallanController(DispatchReturnChallanService service) {
        this.service = service;
    }

    @PostMapping("/create")
    public ResponseEntity<DispatchReturnChallanResponseDTO> create(@RequestBody DispatchReturnChallanRequestDTO dto) {
        return ResponseEntity.ok(service.create(dto));
    }

    @GetMapping
    public ResponseEntity<List<DispatchReturnChallanResponseDTO>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DispatchReturnChallanResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DispatchReturnChallanResponseDTO> update(
            @PathVariable Long id,
            @RequestBody DispatchReturnChallanRequestDTO dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}