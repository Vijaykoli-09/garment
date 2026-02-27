package com.garment.controller;

import com.garment.DTO.JobInwardChallanRequest;
import com.garment.DTO.JobInwardChallanResponse;
import com.garment.service.JobInwardChallanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/job-inward-challan")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class JobInwardChallanController {
    private final JobInwardChallanService service;

    @GetMapping
    public ResponseEntity<List<JobInwardChallanResponse>> list() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobInwardChallanResponse> getOne(@PathVariable("id") Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PostMapping
    public ResponseEntity<JobInwardChallanResponse> create(@RequestBody JobInwardChallanRequest req) {
        return ResponseEntity.ok(service.save(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<JobInwardChallanResponse> update(@PathVariable("id") Long id, @RequestBody JobInwardChallanRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
