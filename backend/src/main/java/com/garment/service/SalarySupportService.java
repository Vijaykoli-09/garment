package com.garment.service;

import java.time.LocalDate;
import java.util.List;

import com.garment.DTO.EmployeeSalarySupportDTO;

public interface SalarySupportService {

    /**
     * Employee-wise summary used by SalaryReport.
     * Filters:
     * - If employeeCode present => only that employee (ALL processes as employee has single process master)
     * - Else if processSerialNo present => only employees in that process
     * - Else => all employees
     *
     * Attendance respects DOJ. Missing attendance record => PRESENT.
     */
    List<EmployeeSalarySupportDTO> getEmployeeWiseSupport(LocalDate from, LocalDate to, String employeeCode, String processSerialNo);
}