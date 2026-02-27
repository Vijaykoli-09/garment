package com.garment.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.garment.DTO.OtherDispatchChallanDTO;
import com.garment.service.OtherDispatchChallanService;

@RestController
@RequestMapping("api/other-dispatch-challan")
@CrossOrigin(origins = "http://localhost:3000")   // adjust if needed
public class OtherDispatchChallanController {

    private final OtherDispatchChallanService service;

    public OtherDispatchChallanController(OtherDispatchChallanService service) {
        this.service = service;
    }

    // POST /api/other-dispatch-challan/create
    @PostMapping("/create")
    public ResponseEntity<OtherDispatchChallanDTO> create(@RequestBody OtherDispatchChallanDTO dto) {
        OtherDispatchChallanDTO saved = service.create(dto);
        return ResponseEntity.ok(saved);
    }

    // GET /api/other-dispatch-challan
    @GetMapping
    public ResponseEntity<List<OtherDispatchChallanDTO>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    // GET /api/other-dispatch-challan/{id}
    @GetMapping("/{id}")
    public ResponseEntity<OtherDispatchChallanDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    // PUT /api/other-dispatch-challan/{id}
    @PutMapping("/{id}")
    public ResponseEntity<OtherDispatchChallanDTO> update(
            @PathVariable Long id,
            @RequestBody OtherDispatchChallanDTO dto
    ) {
        OtherDispatchChallanDTO updated = service.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    // DELETE /api/other-dispatch-challan/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}