package com.garment.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Month-wise breakdown required to correctly calculate MONTHLY / ATTENDENCE salary
 * across multi-month date ranges.
 *
 * month: "YYYY-MM"
 *
 * Salary payable formula (per month):
 *   salaryPayable = monthlySalary / calendarDaysInMonth * effectiveDaysWithinSelectedRange
 *
 * Attendance logic:
 *   PRESENT = 1
 *   HALF_DAY = 0.5
 *   ABSENT = 0
 *
 * Missing attendance record => PRESENT (so only exception records matter).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlySalaryBreakdownDTO {

    private String month; // "YYYY-MM"

    private int calendarDays; // total days in that calendar month (28/29/30/31)
    private int selectedDays; // days selected in this month after applying range + DOJ

    private int presentDays;
    private int halfDays;
    private int absentDays;

    private double effectiveDays;       // present + half*0.5
    private double attendancePercent;   // effectiveDays / selectedDays * 100

    private Double monthlySalary;       // employee configured monthly salary (for reference)
    private double salaryPayable;       // computed payable for this month (rounded)
}