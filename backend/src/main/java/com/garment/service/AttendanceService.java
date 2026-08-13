package com.garment.service;

import java.time.LocalDate;
import java.util.List;

import com.garment.DTO.AttendanceDayStatusDTO;
import com.garment.DTO.AttendanceResponseDTO;
import com.garment.DTO.AttendanceSummaryDTO;
import com.garment.DTO.AttendanceUpsertRequestDTO;

public interface AttendanceService {

    /**
     * Upsert attendance exception for employee+date.
     * - If status = PRESENT (or null) => delete exception (default PRESENT).
     * - If status = ABSENT/HALF_DAY => create or update exception.
     * Duplicate employee+date prevented by service + DB unique constraint.
     */
    AttendanceResponseDTO upsertAttendance(AttendanceUpsertRequestDTO request);

    /**
     * Deletes attendance exception for employee+date, reverting to default PRESENT.
     */
    void deleteAttendanceException(String employeeCode, LocalDate date);

    /**
     * Effective attendance status for employee+date:
     * - No record => PRESENT
     * - Date < DOJ => applicable=false (do not count)
     */
    AttendanceDayStatusDTO getDayStatus(String employeeCode, LocalDate date);

    /**
     * Lists stored exceptions (normally ABSENT/HALF_DAY) for filters.
     * from/to mandatory.
     */
    List<AttendanceResponseDTO> listExceptions(LocalDate from, LocalDate to, String employeeCode, String processSerialNo);

    /**
     * Attendance summary for range, respecting DOJ.
     */
    List<AttendanceSummaryDTO> getSummary(LocalDate from, LocalDate to, String employeeCode, String processSerialNo);
}