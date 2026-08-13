package com.garment.DTO;

import java.time.LocalDate;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Backend support DTO for Salary Report:
 * - Employee core fields
 * - Attendance summary (respects DOJ, missing => PRESENT)
 * - Extra hours totals (rate is per entry, totals computed)
 *
 * IMPORTANT:
 * For MONTHLY / ATTENDENCE employees, multi-month ranges MUST be calculated month-by-month.
 * Therefore this DTO now includes month-wise breakdown: monthlyBreakdown.
 *
 * Production / ADV / Opening / Net is still handled by your existing frontend logic.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeSalarySupportDTO {

    // Employee
    private String employeeCode;
    private String employeeName;
    private String salaryType;

    private Double monthlySalary;
    private Double workingHours; // normal working hours (existing field)
    private Double hourlyRate;   // employee hourly rate (if used)
    private LocalDate dateOfJoining;

    private String processSerialNo;
    private String processName;

    // Range (as requested by API)
    private LocalDate fromDate;
    private LocalDate toDate;

    // Attendance (Aggregated for the whole selected range AFTER DOJ is applied)
    private int totalDays;
    private int presentDays;
    private int absentDays;
    private int halfDays;
    private double effectiveDays;
    private double attendancePercent;

    // Extra Hours (Totals for the whole selected range AFTER DOJ is applied)
    private double totalExtraHours;
    private double totalExtraHourAmount;
    private double averageExtraHourRate;

    /**
     * Month-wise breakdown (only populated for MONTHLY / ATTENDENCE salary types).
     * This is REQUIRED to correctly calculate salary payable when:
     * - the selected range spans multiple calendar months, and
     * - attendance impacts salary calculation.
     */
    private List<MonthlySalaryBreakdownDTO> monthlyBreakdown;
}