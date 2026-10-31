package com.garment.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.garment.DTO.DispatchChallanDTO;
import com.garment.DTO.DispatchChallanListDTO;
import com.garment.DTO.DispatchStockSummaryDTO;
import com.garment.DTO.NextDispatchNumbersDTO;
import com.garment.DTO.PagedResponse;
import com.garment.service.DispatchChallanService;

@RestController
@RequestMapping("api/dispatch-challan")
@CrossOrigin(originPatterns = "*")
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

    @GetMapping("/paged")
    public PagedResponse<DispatchChallanListDTO> getAllPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search
    ) {
        return service.getAllPaged(page, size, search);
    }

    /**
     * Lightweight aggregate endpoint used by the Dispatch stock picker.
     * Avoids fetching the full Dispatch Challan history with child entities.
     */
    @GetMapping("/stock-summary")
    public ResponseEntity<List<DispatchStockSummaryDTO>> getDispatchStockSummary() {
        return ResponseEntity.ok(service.getDispatchStockSummary());
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

    // NEW: GET /dispatch-challan/next?date=2026-01-01&partyName=...&brokerName=...
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