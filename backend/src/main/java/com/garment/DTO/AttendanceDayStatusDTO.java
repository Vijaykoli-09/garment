package com.garment.DTO;

import java.time.LocalDate;

import com.garment.enums.AttendanceStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * For a given employee + date, returns effective attendance status.
 * If there is no record => status = PRESENT (default).
 * If date is before DOJ => applicable = false (must NOT be counted).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceDayStatusDTO {
    private String employeeCode;
    private String employeeName;
    private LocalDate date;

    private boolean applicable; // false if date < employee.dateOfJoining
    private AttendanceStatus status; // defaults to PRESENT when applicable and no exception
}