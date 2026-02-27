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

import com.garment.DTO.DispatchChallanDTO;
import com.garment.service.DispatchChallanService;

@RestController
@RequestMapping("api/dispatch-challan")
@CrossOrigin(origins = "http://localhost:3000")   // adjust origin for your React app if needed
public class DispatchChallanController {

    private final DispatchChallanService service;

    public DispatchChallanController(DispatchChallanService service) {
        this.service = service;
    }

    // POST /dispatch-challan/create
    @PostMapping("/create")
    public ResponseEntity<DispatchChallanDTO> create(@RequestBody DispatchChallanDTO dto) {
        DispatchChallanDTO saved = service.create(dto);
        return ResponseEntity.ok(saved);
    }

    // GET /dispatch-challan
    @GetMapping
    public ResponseEntity<List<DispatchChallanDTO>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    // GET /dispatch-challan/{id}
    @GetMapping("/{id}")
    public ResponseEntity<DispatchChallanDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    // PUT /dispatch-challan/{id}
    @PutMapping("/{id}")
    public ResponseEntity<DispatchChallanDTO> update(
            @PathVariable Long id,
            @RequestBody DispatchChallanDTO dto
    ) {
        DispatchChallanDTO updated = service.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    // DELETE /dispatch-challan/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}