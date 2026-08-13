package com.garment.DTO;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Summary for attendance for an employee in a date range.
 * Rule: Missing record => PRESENT
 * ABSENT => 0 day
 * HALF_DAY => 0.5 day
 * Dates before DOJ are excluded (not counted).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceSummaryDTO {
    private String employeeCode;
    private String employeeName;

    private String processSerialNo;
    private String processName;

    private LocalDate fromDate;
    private LocalDate toDate;

    private int totalDays;       // days counted after respecting DOJ
    private int presentDays;     // default present days
    private int absentDays;
    private int halfDays;

    private double effectiveDays;     // present + 0.5 * halfDays
    private double attendancePercent; // (effectiveDays/totalDays)*100
}