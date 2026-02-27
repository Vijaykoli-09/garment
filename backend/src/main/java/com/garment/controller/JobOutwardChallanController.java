package com.garment.controller;

import com.garment.DTO.JobOutwardChallanRequestDTO;
import com.garment.DTO.JobOutwardChallanResponseDTO;
import com.garment.model.CuttingLotRow;
import com.garment.repository.CuttingLotRowRepository;
import com.garment.service.JobOutwardChallanService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/job-outward-challan")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class JobOutwardChallanController {
    private final JobOutwardChallanService service;
    private final CuttingLotRowRepository cuttingLotRowRepository;

    @GetMapping("/next-serial")
    public ResponseEntity<String> nextSerial(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(service.nextSerial(date));
    }
    

    @PostMapping
    public ResponseEntity<JobOutwardChallanResponseDTO> create(@RequestBody JobOutwardChallanRequestDTO dto) {
        return ResponseEntity.ok(service.create(dto));
    }

    @PutMapping("/{serialNo}")
    public ResponseEntity<JobOutwardChallanResponseDTO> update(@PathVariable String serialNo, @RequestBody JobOutwardChallanRequestDTO dto) {
        return ResponseEntity.ok(service.update(serialNo, dto));
    }

    @GetMapping("/{serialNo}")
    public ResponseEntity<JobOutwardChallanResponseDTO> get(@PathVariable String serialNo) {
        return ResponseEntity.ok(service.get(serialNo));
    }

    @GetMapping
    public ResponseEntity<List<JobOutwardChallanResponseDTO>> list() {
        return ResponseEntity.ok(service.list());
    }

    @DeleteMapping("/{serialNo}")
    public ResponseEntity<Void> delete(@PathVariable String serialNo) {
        service.delete(serialNo);
        return ResponseEntity.noContent().build();
    }

    // Utility endpoint the frontend can call when user selects a cutLotNo to get related lot rows.
    @GetMapping("/cutting-lot-rows")
    public ResponseEntity<List<CuttingLotRow>> cuttingLotRows(@RequestParam String cutLotNo) {
        List<CuttingLotRow> rows = cuttingLotRowRepository.findByCutLotNoOrderBySnoAsc(cutLotNo);
        return ResponseEntity.ok(rows);
    }
}
