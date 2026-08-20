package com.garment.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.garment.DTO.DispatchReturnChallanDTO;
import com.garment.DTO.NextDispatchNumbersDTO;
import com.garment.service.DispatchReturnChallanService;

@RestController
@RequestMapping("api/dispatch-return-challan")
@CrossOrigin(origins = "http://localhost:3000")
public class DispatchReturnChallanController {

    private final DispatchReturnChallanService service;

    public DispatchReturnChallanController(DispatchReturnChallanService service) {
        this.service = service;
    }

    // POST /dispatch-return-challan/create
    @PostMapping("/create")
    public ResponseEntity<DispatchReturnChallanDTO> create(@RequestBody DispatchReturnChallanDTO dto) {
        DispatchReturnChallanDTO saved = service.create(dto);
        return ResponseEntity.ok(saved);
    }

    // GET /dispatch-return-challan
    @GetMapping
    public ResponseEntity<List<DispatchReturnChallanDTO>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    // GET /dispatch-return-challan/{id}
    @GetMapping("/{id}")
    public ResponseEntity<DispatchReturnChallanDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    // PUT /dispatch-return-challan/{id}
    @PutMapping("/{id}")
    public ResponseEntity<DispatchReturnChallanDTO> update(
            @PathVariable Long id,
            @RequestBody DispatchReturnChallanDTO dto
    ) {
        DispatchReturnChallanDTO updated = service.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    // DELETE /dispatch-return-challan/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    // GET /dispatch-return-challan/next?date=2026-01-01&partyName=...&brokerName=...
    @GetMapping("/next")
    public ResponseEntity<NextDispatchNumbersDTO> getNextNumbers(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String partyName,
            @RequestParam(required = false) String brokerName
    ) {
        NextDispatchNumbersDTO dto = service.getNextNumbers(date, partyName, brokerName);
        return ResponseEntity.ok(dto);
    }
}