package com.garment.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.format.annotation.DateTimeFormat.ISO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.garment.DTO.EmployeeSalarySupportDTO;
import com.garment.service.SalarySupportService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/salary-support")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class SalarySupportController {

    private final SalarySupportService salarySupportService;

    @GetMapping("/employee-wise")
    public ResponseEntity<List<EmployeeSalarySupportDTO>> employeeWise(
            @RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate to,
            @RequestParam(required = false) String employeeCode,
            @RequestParam(required = false) String processSerialNo
    ) {
        return ResponseEntity.ok(salarySupportService.getEmployeeWiseSupport(from, to, employeeCode, processSerialNo));
    }
}