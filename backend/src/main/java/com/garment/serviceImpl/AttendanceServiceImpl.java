package com.garment.serviceImpl;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.garment.DTO.AttendanceDayStatusDTO;
import com.garment.DTO.AttendanceResponseDTO;
import com.garment.DTO.AttendanceSummaryDTO;
import com.garment.DTO.AttendanceUpsertRequestDTO;
import com.garment.enums.AttendanceStatus;
import com.garment.model.Attendance;
import com.garment.model.Employee;
import com.garment.model.Process;
import com.garment.repository.AttendanceRepository;
import com.garment.repository.EmployeeRepository;
import com.garment.service.AttendanceService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class AttendanceServiceImpl implements AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;

    @Override
    public AttendanceResponseDTO upsertAttendance(AttendanceUpsertRequestDTO request) {
        if (request == null) {
            throw new RuntimeException("Request cannot be null");
        }
        if (request.getEmployeeCode() == null || request.getEmployeeCode().trim().isEmpty()) {
            throw new RuntimeException("Employee code is required");
        }
        if (request.getDate() == null) {
            throw new RuntimeException("Date is required");
        }

        final String empCode = request.getEmployeeCode().trim();
        final LocalDate date = request.getDate();
        final AttendanceStatus status = request.getStatus() == null ? AttendanceStatus.PRESENT : request.getStatus();

        Employee employee = employeeRepository.findById(empCode)
                .orElseThrow(() -> new RuntimeException("Employee not found: " + empCode));

        // Respect DOJ: do not allow attendance marking before joining
        if (employee.getDateOfJoining() != null && date.isBefore(employee.getDateOfJoining())) {
            throw new RuntimeException("Attendance date cannot be before employee Date of Joining");
        }

        Optional<Attendance> existingOpt = attendanceRepository.findByEmployee_CodeAndDate(empCode, date);

        // If PRESENT => remove exception (default PRESENT)
        if (status == AttendanceStatus.PRESENT) {
            existingOpt.ifPresent(attendanceRepository::delete);
            return AttendanceResponseDTO.builder()
                    .id(existingOpt.map(Attendance::getId).orElse(null))
                    .employeeCode(employee.getCode())
                    .employeeName(employee.getEmployeeName())
                    .processSerialNo(employee.getProcess() != null ? String.valueOf(employee.getProcess().getSerialNo()) : null)
                    .processName(employee.getProcess() != null ? employee.getProcess().getProcessName() : null)
                    .date(date)
                    .status(AttendanceStatus.PRESENT)
                    .build();
        }

        Attendance entity = existingOpt.orElseGet(() -> Attendance.builder()
                .employee(employee)
                .date(date)
                .build());

        entity.setStatus(status);

        Attendance saved = attendanceRepository.save(entity);
        return toDTO(saved);
    }

    @Override
    public void deleteAttendanceException(String employeeCode, LocalDate date) {
        if (employeeCode == null || employeeCode.trim().isEmpty()) {
            throw new RuntimeException("Employee code is required");
        }
        if (date == null) {
            throw new RuntimeException("Date is required");
        }
        attendanceRepository.findByEmployee_CodeAndDate(employeeCode.trim(), date)
                .ifPresent(attendanceRepository::delete);
    }

    @Override
    @Transactional(readOnly = true)
    public AttendanceDayStatusDTO getDayStatus(String employeeCode, LocalDate date) {
        if (employeeCode == null || employeeCode.trim().isEmpty()) {
            throw new RuntimeException("Employee code is required");
        }
        if (date == null) {
            throw new RuntimeException("Date is required");
        }

        Employee employee = employeeRepository.findById(employeeCode.trim())
                .orElseThrow(() -> new RuntimeException("Employee not found: " + employeeCode));

        boolean applicable = true;
        if (employee.getDateOfJoining() != null && date.isBefore(employee.getDateOfJoining())) {
            applicable = false;
        }

        AttendanceStatus effectiveStatus = AttendanceStatus.PRESENT;
        if (applicable) {
            effectiveStatus = attendanceRepository.findByEmployee_CodeAndDate(employee.getCode(), date)
                    .map(Attendance::getStatus)
                    .orElse(AttendanceStatus.PRESENT);
        }

        return AttendanceDayStatusDTO.builder()
                .employeeCode(employee.getCode())
                .employeeName(employee.getEmployeeName())
                .date(date)
                .applicable(applicable)
                .status(effectiveStatus)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceResponseDTO> listExceptions(LocalDate from, LocalDate to, String employeeCode, String processSerialNo) {
        if (from == null || to == null) {
            throw new RuntimeException("From and To dates are required");
        }
        if (to.isBefore(from)) {
            throw new RuntimeException("To date cannot be before From date");
        }

        List<Attendance> list;
        boolean hasEmp = employeeCode != null && !employeeCode.trim().isEmpty();
        boolean hasProc = processSerialNo != null && !processSerialNo.trim().isEmpty();

        if (hasEmp && hasProc) {
            list = attendanceRepository.findByEmployee_Process_SerialNoAndEmployee_CodeAndDateBetween(
                    processSerialNo.trim(), employeeCode.trim(), from, to
            );
        } else if (hasEmp) {
            list = attendanceRepository.findByEmployee_CodeAndDateBetween(employeeCode.trim(), from, to);
        } else if (hasProc) {
            list = attendanceRepository.findByEmployee_Process_SerialNoAndDateBetween(processSerialNo.trim(), from, to);
        } else {
            list = attendanceRepository.findByDateBetween(from, to);
        }

        // Normally exceptions only: ABSENT/HALF_DAY (we don't want PRESENT stored)
        List<AttendanceResponseDTO> out = new ArrayList<>();
        for (Attendance a : list) {
            if (a.getStatus() != null && a.getStatus() != AttendanceStatus.PRESENT) {
                out.add(toDTO(a));
            }
        }
        return out;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceSummaryDTO> getSummary(LocalDate from, LocalDate to, String employeeCode, String processSerialNo) {
        if (from == null || to == null) {
            throw new RuntimeException("From and To dates are required");
        }
        if (to.isBefore(from)) {
            throw new RuntimeException("To date cannot be before From date");
        }

        List<Employee> employees;
        boolean hasEmp = employeeCode != null && !employeeCode.trim().isEmpty();
        boolean hasProc = processSerialNo != null && !processSerialNo.trim().isEmpty();

        if (hasEmp) {
            Employee e = employeeRepository.findById(employeeCode.trim())
                    .orElseThrow(() -> new RuntimeException("Employee not found: " + employeeCode));
            employees = List.of(e);
        } else if (hasProc) {
            employees = employeeRepository.findByProcess_SerialNo(processSerialNo.trim());
        } else {
            employees = employeeRepository.findAll();
        }

        List<AttendanceSummaryDTO> result = new ArrayList<>();

        for (Employee e : employees) {
            LocalDate effectiveFrom = from;

            if (e.getDateOfJoining() != null && effectiveFrom.isBefore(e.getDateOfJoining())) {
                effectiveFrom = e.getDateOfJoining();
            }

            // If after applying DOJ, range becomes empty => 0 days
            if (effectiveFrom.isAfter(to)) {
                result.add(buildEmptySummary(e, from, to));
                continue;
            }

            List<Attendance> exceptions = attendanceRepository.findByEmployee_CodeAndDateBetween(e.getCode(), effectiveFrom, to);

            Map<AttendanceStatus, Integer> counts = new EnumMap<>(AttendanceStatus.class);
            counts.put(AttendanceStatus.ABSENT, 0);
            counts.put(AttendanceStatus.HALF_DAY, 0);
            counts.put(AttendanceStatus.PRESENT, 0);

            for (Attendance a : exceptions) {
                AttendanceStatus st = a.getStatus() == null ? AttendanceStatus.PRESENT : a.getStatus();
                counts.put(st, counts.getOrDefault(st, 0) + 1);
            }

            int totalDays = (int) ChronoUnit.DAYS.between(effectiveFrom, to) + 1;
            int absentDays = counts.getOrDefault(AttendanceStatus.ABSENT, 0);
            int halfDays = counts.getOrDefault(AttendanceStatus.HALF_DAY, 0);

            // Missing record => PRESENT
            int presentDays = totalDays - absentDays - halfDays;
            if (presentDays < 0) presentDays = 0;

            double effectiveDays = presentDays + (0.5 * halfDays);
            double percent = totalDays <= 0 ? 0.0 : (effectiveDays / totalDays) * 100.0;

            Process p = e.getProcess();

            result.add(AttendanceSummaryDTO.builder()
                    .employeeCode(e.getCode())
                    .employeeName(e.getEmployeeName())
                    .processSerialNo(p != null ? String.valueOf(p.getSerialNo()) : null)
                    .processName(p != null ? p.getProcessName() : null)
                    .fromDate(from)
                    .toDate(to)
                    .totalDays(totalDays)
                    .presentDays(presentDays)
                    .absentDays(absentDays)
                    .halfDays(halfDays)
                    .effectiveDays(round2(effectiveDays))
                    .attendancePercent(round2(percent))
                    .build());
        }

        return result;
    }

    private AttendanceSummaryDTO buildEmptySummary(Employee e, LocalDate from, LocalDate to) {
        Process p = e.getProcess();
        return AttendanceSummaryDTO.builder()
                .employeeCode(e.getCode())
                .employeeName(e.getEmployeeName())
                .processSerialNo(p != null ? String.valueOf(p.getSerialNo()) : null)
                .processName(p != null ? p.getProcessName() : null)
                .fromDate(from)
                .toDate(to)
                .totalDays(0)
                .presentDays(0)
                .absentDays(0)
                .halfDays(0)
                .effectiveDays(0.0)
                .attendancePercent(0.0)
                .build();
    }

    private AttendanceResponseDTO toDTO(Attendance a) {
        Employee e = a.getEmployee();
        Process p = (e != null) ? e.getProcess() : null;

        return AttendanceResponseDTO.builder()
                .id(a.getId())
                .employeeCode(e != null ? e.getCode() : null)
                .employeeName(e != null ? e.getEmployeeName() : null)
                .processSerialNo(p != null ? String.valueOf(p.getSerialNo()) : null)
                .processName(p != null ? p.getProcessName() : null)
                .date(a.getDate())
                .status(a.getStatus())
                .build();
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}