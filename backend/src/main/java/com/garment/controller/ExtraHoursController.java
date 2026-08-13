package com.garment.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.format.annotation.DateTimeFormat.ISO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.garment.DTO.ExtraHoursRequestDTO;
import com.garment.DTO.ExtraHoursResponseDTO;
import com.garment.DTO.ExtraHoursSummaryDTO;
import com.garment.service.ExtraHoursService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/extra-hours")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class ExtraHoursController {

    private final ExtraHoursService extraHoursService;

    @PostMapping
    public ResponseEntity<ExtraHoursResponseDTO> create(@RequestBody ExtraHoursRequestDTO request) {
        return ResponseEntity.ok(extraHoursService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ExtraHoursResponseDTO> update(@PathVariable Long id, @RequestBody ExtraHoursRequestDTO request) {
        return ResponseEntity.ok(extraHoursService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(@PathVariable Long id) {
        extraHoursService.delete(id);
        return ResponseEntity.ok("Extra hours deleted successfully.");
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExtraHoursResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(extraHoursService.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<ExtraHoursResponseDTO>> list(
            @RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate to,
            @RequestParam(required = false) String employeeCode,
            @RequestParam(required = false) String processSerialNo
    ) {
        return ResponseEntity.ok(extraHoursService.list(from, to, employeeCode, processSerialNo));
    }

    @GetMapping("/summary")
    public ResponseEntity<List<ExtraHoursSummaryDTO>> summary(
            @RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate to,
            @RequestParam(required = false) String employeeCode,
            @RequestParam(required = false) String processSerialNo
    ) {
        return ResponseEntity.ok(extraHoursService.summary(from, to, employeeCode, processSerialNo));
    }
}