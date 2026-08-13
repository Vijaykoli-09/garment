package com.garment.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.format.annotation.DateTimeFormat.ISO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.garment.DTO.AttendanceDayStatusDTO;
import com.garment.DTO.AttendanceResponseDTO;
import com.garment.DTO.AttendanceSummaryDTO;
import com.garment.DTO.AttendanceUpsertRequestDTO;
import com.garment.service.AttendanceService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class AttendanceController {

    private final AttendanceService attendanceService;

    /**
     * Upsert exception:
     * - ABSENT/HALF_DAY => stored
     * - PRESENT => exception deleted (default PRESENT)
     */
    @PostMapping
    public ResponseEntity<AttendanceResponseDTO> upsert(@RequestBody AttendanceUpsertRequestDTO request) {
        return ResponseEntity.ok(attendanceService.upsertAttendance(request));
    }

    /**
     * Delete exception => revert to default PRESENT
     */
    @DeleteMapping
    public ResponseEntity<String> deleteException(
            @RequestParam String employeeCode,
            @RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate date
    ) {
        attendanceService.deleteAttendanceException(employeeCode, date);
        return ResponseEntity.ok("Attendance exception deleted (default PRESENT).");
    }

    /**
     * Effective status for employee+date (default PRESENT if no record; applicable false before DOJ)
     */
    @GetMapping("/status")
    public ResponseEntity<AttendanceDayStatusDTO> dayStatus(
            @RequestParam String employeeCode,
            @RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(attendanceService.getDayStatus(employeeCode, date));
    }

    /**
     * List stored exceptions in date range (ABSENT/HALF_DAY)
     */
    @GetMapping("/exceptions")
    public ResponseEntity<List<AttendanceResponseDTO>> exceptions(
            @RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate to,
            @RequestParam(required = false) String employeeCode,
            @RequestParam(required = false) String processSerialNo
    ) {
        return ResponseEntity.ok(attendanceService.listExceptions(from, to, employeeCode, processSerialNo));
    }

    /**
     * Summary in date range (respects DOJ)
     */
    @GetMapping("/summary")
    public ResponseEntity<List<AttendanceSummaryDTO>> summary(
            @RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate to,
            @RequestParam(required = false) String employeeCode,
            @RequestParam(required = false) String processSerialNo
    ) {
        return ResponseEntity.ok(attendanceService.getSummary(from, to, employeeCode, processSerialNo));
    }
}