package com.garment.serviceImpl;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.garment.DTO.EmployeeSalarySupportDTO;
import com.garment.DTO.MonthlySalaryBreakdownDTO;
import com.garment.enums.AttendanceStatus;
import com.garment.model.Attendance;
import com.garment.model.Employee;
import com.garment.model.ExtraHours;
import com.garment.model.Process;
import com.garment.repository.AttendanceRepository;
import com.garment.repository.EmployeeRepository;
import com.garment.repository.ExtraHoursRepository;
import com.garment.service.SalarySupportService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SalarySupportServiceImpl implements SalarySupportService {

    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;
    private final ExtraHoursRepository extraHoursRepository;

    @Override
    public List<EmployeeSalarySupportDTO> getEmployeeWiseSupport(LocalDate from, LocalDate to, String employeeCode, String processSerialNo) {
        if (from == null || to == null) throw new RuntimeException("From and To dates are required");
        if (to.isBefore(from)) throw new RuntimeException("To date cannot be before From date");

        final boolean hasEmp = employeeCode != null && !employeeCode.trim().isEmpty();
        final boolean hasProc = processSerialNo != null && !processSerialNo.trim().isEmpty();

        List<Employee> employees;
        if (hasEmp) {
            Employee e = employeeRepository.findById(employeeCode.trim())
                    .orElseThrow(() -> new RuntimeException("Employee not found: " + employeeCode));
            employees = List.of(e);
        } else if (hasProc) {
            employees = employeeRepository.findByProcess_SerialNo(processSerialNo.trim());
        } else {
            employees = employeeRepository.findAll();
        }

        return employees.stream()
                .map(e -> buildSupportForEmployee(e, from, to))
                .sorted((a, b) -> {
                    String an = a.getEmployeeName() == null ? "" : a.getEmployeeName();
                    String bn = b.getEmployeeName() == null ? "" : b.getEmployeeName();
                    return an.compareToIgnoreCase(bn);
                })
                .toList();
    }

    private EmployeeSalarySupportDTO buildSupportForEmployee(Employee e, LocalDate from, LocalDate to) {
        Process p = e.getProcess();

        // Respect DOJ for any attendance/salary computation.
        LocalDate effectiveFrom = from;
        if (e.getDateOfJoining() != null && effectiveFrom.isBefore(e.getDateOfJoining())) {
            effectiveFrom = e.getDateOfJoining();
        }

        int totalDays = 0;
        int absentDays = 0;
        int halfDays = 0;
        int presentDays = 0;
        double effectiveDays = 0.0;
        double attendancePercent = 0.0;

        double totalExtraHours = 0.0;
        double totalExtraAmount = 0.0;
        double avgExtraRate = 0.0;

        // Month-wise breakdown is only required for MONTHLY / ATTENDENCE salary types.
        final boolean needsMonthlyBreakdown = isMonthlyAttendanceSalaryType(e.getSalaryType());

        List<MonthlySalaryBreakdownDTO> monthlyBreakdown = new ArrayList<>();

        if (!effectiveFrom.isAfter(to)) {
            // ---------- Attendance exceptions for whole effective range ----------
            List<Attendance> exceptions =
                    attendanceRepository.findByEmployee_CodeAndDateBetween(e.getCode(), effectiveFrom, to);

            // Aggregate attendance (existing behavior)
            totalDays = (int) ChronoUnit.DAYS.between(effectiveFrom, to) + 1;

            for (Attendance a : exceptions) {
                AttendanceStatus st = a.getStatus() == null ? AttendanceStatus.PRESENT : a.getStatus();
                if (st == AttendanceStatus.ABSENT) absentDays++;
                else if (st == AttendanceStatus.HALF_DAY) halfDays++;
            }

            presentDays = totalDays - absentDays - halfDays;
            if (presentDays < 0) presentDays = 0;

            effectiveDays = presentDays + (0.5 * halfDays);
            attendancePercent = totalDays <= 0 ? 0.0 : (effectiveDays / totalDays) * 100.0;

            // ---------- Extra hours (existing behavior) ----------
            List<ExtraHours> extraList =
                    extraHoursRepository.findByEmployee_CodeAndDateBetween(e.getCode(), effectiveFrom, to);

            for (ExtraHours x : extraList) {
                totalExtraHours += x.getExtraHours() == null ? 0.0 : x.getExtraHours();
                totalExtraAmount += x.getAmount() == null ? 0.0 : x.getAmount();
            }
            avgExtraRate = totalExtraHours == 0 ? 0.0 : totalExtraAmount / totalExtraHours;

            // ---------- Month-wise breakdown (NEW) ----------
            if (needsMonthlyBreakdown) {
                // Group exceptions by month once (fast + clean)
                Map<YearMonth, List<Attendance>> exceptionsByMonth = exceptions.stream()
                        .filter(a -> a.getDate() != null)
                        .collect(Collectors.groupingBy(a -> YearMonth.from(a.getDate())));

                YearMonth cur = YearMonth.from(from);
                YearMonth end = YearMonth.from(to);

                final LocalDate doj = e.getDateOfJoining();
                final double empMonthlySalary = e.getMonthlySalary() == null ? 0.0 : e.getMonthlySalary();

                while (!cur.isAfter(end)) {
                    LocalDate monthStart = cur.atDay(1);
                    LocalDate monthEnd = cur.atEndOfMonth();

                    // Intersect: [from..to] with this month
                    LocalDate selectedStart = maxDate(from, monthStart);
                    LocalDate selectedEnd = minDate(to, monthEnd);

                    // Apply DOJ
                    if (doj != null && selectedStart.isBefore(doj)) {
                        selectedStart = doj;
                    }

                    if (!selectedStart.isAfter(selectedEnd)) {
                        int selectedDays = (int) ChronoUnit.DAYS.between(selectedStart, selectedEnd) + 1;
                        int calendarDays = cur.lengthOfMonth();

                        int mAbsent = 0;
                        int mHalf = 0;

                        List<Attendance> monthExceptions = exceptionsByMonth.getOrDefault(cur, List.of());
                        for (Attendance a : monthExceptions) {
                            if (a.getDate() == null) continue;
                            LocalDate ad = a.getDate();
                            if (ad.isBefore(selectedStart) || ad.isAfter(selectedEnd)) continue;

                            AttendanceStatus st = a.getStatus() == null ? AttendanceStatus.PRESENT : a.getStatus();
                            if (st == AttendanceStatus.ABSENT) mAbsent++;
                            else if (st == AttendanceStatus.HALF_DAY) mHalf++;
                        }

                        int mPresent = selectedDays - mAbsent - mHalf;
                        if (mPresent < 0) mPresent = 0;

                        double mEffective = mPresent + (0.5 * mHalf);
                        double mAttPercent = selectedDays <= 0 ? 0.0 : (mEffective / selectedDays) * 100.0;

                        double mPayable = (calendarDays <= 0) ? 0.0 : (empMonthlySalary / calendarDays) * mEffective;

                        monthlyBreakdown.add(MonthlySalaryBreakdownDTO.builder()
                                .month(cur.toString()) // "YYYY-MM"
                                .calendarDays(calendarDays)
                                .selectedDays(selectedDays)
                                .presentDays(mPresent)
                                .halfDays(mHalf)
                                .absentDays(mAbsent)
                                .effectiveDays(round2(mEffective))
                                .attendancePercent(round2(mAttPercent))
                                .monthlySalary(e.getMonthlySalary())
                                .salaryPayable(round2(mPayable))
                                .build());
                    }

                    cur = cur.plusMonths(1);
                }
            }
        }

        return EmployeeSalarySupportDTO.builder()
                .employeeCode(e.getCode())
                .employeeName(e.getEmployeeName())
                .salaryType(e.getSalaryType())
                .monthlySalary(e.getMonthlySalary())
                .workingHours(e.getWorkingHours())
                .hourlyRate(e.getHourlyRate())
                .dateOfJoining(e.getDateOfJoining())
                .processSerialNo(p != null ? String.valueOf(p.getSerialNo()) : null)
                .processName(p != null ? p.getProcessName() : null)
                .fromDate(from)
                .toDate(to)
                .totalDays(totalDays)
                .presentDays(presentDays)
                .absentDays(absentDays)
                .halfDays(halfDays)
                .effectiveDays(round2(effectiveDays))
                .attendancePercent(round2(attendancePercent))
                .totalExtraHours(round2(totalExtraHours))
                .totalExtraHourAmount(round2(totalExtraAmount))
                .averageExtraHourRate(round3(avgExtraRate))
                .monthlyBreakdown(monthlyBreakdown)
                .build();
    }

    private boolean isMonthlyAttendanceSalaryType(String salaryType) {
        if (salaryType == null) return false;
        String st = salaryType.trim();
        return st.equalsIgnoreCase("MONTHLY") || st.equalsIgnoreCase("ATTENDENCE");
    }

    private LocalDate maxDate(LocalDate a, LocalDate b) {
        return (a.isAfter(b)) ? a : b;
    }

    private LocalDate minDate(LocalDate a, LocalDate b) {
        return (a.isBefore(b)) ? a : b;
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    private double round3(double v) {
        return Math.round(v * 1000.0) / 1000.0;
    }
}