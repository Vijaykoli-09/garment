package com.garment.serviceImpl;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.garment.DTO.ExtraHoursRequestDTO;
import com.garment.DTO.ExtraHoursResponseDTO;
import com.garment.DTO.ExtraHoursSummaryDTO;
import com.garment.model.Employee;
import com.garment.model.ExtraHours;
import com.garment.model.Process;
import com.garment.repository.EmployeeRepository;
import com.garment.repository.ExtraHoursRepository;
import com.garment.service.ExtraHoursService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class ExtraHoursServiceImpl implements ExtraHoursService {

    private final ExtraHoursRepository extraHoursRepository;
    private final EmployeeRepository employeeRepository;

    @Override
    public ExtraHoursResponseDTO create(ExtraHoursRequestDTO request) {
        validateRequest(request);

        String empCode = request.getEmployeeCode().trim();
        LocalDate date = request.getDate();

        Employee employee = employeeRepository.findById(empCode)
                .orElseThrow(() -> new RuntimeException("Employee not found: " + empCode));

        if (employee.getDateOfJoining() != null && date.isBefore(employee.getDateOfJoining())) {
            throw new RuntimeException("Extra hours date cannot be before employee Date of Joining");
        }

        Optional<ExtraHours> dup = extraHoursRepository.findByEmployee_CodeAndDate(empCode, date);
        if (dup.isPresent()) {
            throw new RuntimeException("Extra hours already exists for this employee and date");
        }

        ExtraHours entity = ExtraHours.builder()
                .employee(employee)
                .date(date)
                .extraHours(nz(request.getExtraHours()))
                .extraHourRate(nz(request.getExtraHourRate()))
                .remarks(request.getRemarks())
                .amount(0.0) // will be recalculated by entity lifecycle
                .build();

        ExtraHours saved = extraHoursRepository.save(entity);
        return toDTO(saved);
    }

    @Override
    public ExtraHoursResponseDTO update(Long id, ExtraHoursRequestDTO request) {
        if (id == null) throw new RuntimeException("Id is required");
        validateRequest(request);

        ExtraHours existing = extraHoursRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Extra hours not found: " + id));

        String empCode = request.getEmployeeCode().trim();
        LocalDate date = request.getDate();

        Employee employee = employeeRepository.findById(empCode)
                .orElseThrow(() -> new RuntimeException("Employee not found: " + empCode));

        if (employee.getDateOfJoining() != null && date.isBefore(employee.getDateOfJoining())) {
            throw new RuntimeException("Extra hours date cannot be before employee Date of Joining");
        }

        // If employee/date changed, ensure no duplicate
        Optional<ExtraHours> dup = extraHoursRepository.findByEmployee_CodeAndDate(empCode, date);
        if (dup.isPresent() && !dup.get().getId().equals(existing.getId())) {
            throw new RuntimeException("Another extra hours entry exists for this employee and date");
        }

        existing.setEmployee(employee);
        existing.setDate(date);
        existing.setExtraHours(nz(request.getExtraHours()));
        existing.setExtraHourRate(nz(request.getExtraHourRate()));
        existing.setRemarks(request.getRemarks());
        // amount recalculated by @PreUpdate

        ExtraHours saved = extraHoursRepository.save(existing);
        return toDTO(saved);
    }

    @Override
    public void delete(Long id) {
        if (id == null) throw new RuntimeException("Id is required");
        if (!extraHoursRepository.existsById(id)) {
            throw new RuntimeException("Extra hours not found: " + id);
        }
        extraHoursRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public ExtraHoursResponseDTO getById(Long id) {
        if (id == null) throw new RuntimeException("Id is required");
        ExtraHours e = extraHoursRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Extra hours not found: " + id));
        return toDTO(e);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExtraHoursResponseDTO> list(LocalDate from, LocalDate to, String employeeCode, String processSerialNo) {
        if (from == null || to == null) {
            throw new RuntimeException("From and To dates are required");
        }
        if (to.isBefore(from)) {
            throw new RuntimeException("To date cannot be before From date");
        }

        boolean hasEmp = employeeCode != null && !employeeCode.trim().isEmpty();
        boolean hasProc = processSerialNo != null && !processSerialNo.trim().isEmpty();

        List<ExtraHours> list;
        if (hasEmp && hasProc) {
            list = extraHoursRepository.findByEmployee_Process_SerialNoAndEmployee_CodeAndDateBetween(
                    processSerialNo.trim(), employeeCode.trim(), from, to
            );
        } else if (hasEmp) {
            list = extraHoursRepository.findByEmployee_CodeAndDateBetween(employeeCode.trim(), from, to);
        } else if (hasProc) {
            list = extraHoursRepository.findByEmployee_Process_SerialNoAndDateBetween(processSerialNo.trim(), from, to);
        } else {
            list = extraHoursRepository.findByDateBetween(from, to);
        }

        List<ExtraHoursResponseDTO> out = new ArrayList<>();
        for (ExtraHours e : list) out.add(toDTO(e));
        return out;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExtraHoursSummaryDTO> summary(LocalDate from, LocalDate to, String employeeCode, String processSerialNo) {
        List<ExtraHoursResponseDTO> entries = list(from, to, employeeCode, processSerialNo);

        // Summary per employeeCode
        // (Keep it simple and stable for frontend)
        return entries.stream()
                .collect(java.util.stream.Collectors.groupingBy(ExtraHoursResponseDTO::getEmployeeCode))
                .entrySet()
                .stream()
                .map(en -> {
                    List<ExtraHoursResponseDTO> rows = en.getValue();
                    ExtraHoursResponseDTO first = rows.get(0);

                    double totalH = rows.stream().mapToDouble(r -> r.getExtraHours() == null ? 0.0 : r.getExtraHours()).sum();
                    double totalA = rows.stream().mapToDouble(r -> r.getAmount() == null ? 0.0 : r.getAmount()).sum();
                    double avgRate = totalH == 0 ? 0.0 : totalA / totalH;

                    return ExtraHoursSummaryDTO.builder()
                            .employeeCode(first.getEmployeeCode())
                            .employeeName(first.getEmployeeName())
                            .processSerialNo(first.getProcessSerialNo())
                            .processName(first.getProcessName())
                            .fromDate(from)
                            .toDate(to)
                            .totalExtraHours(round2(totalH))
                            .totalAmount(round2(totalA))
                            .averageRate(round3(avgRate))
                            .build();
                })
                .sorted((a, b) -> {
                    String an = a.getEmployeeName() == null ? "" : a.getEmployeeName();
                    String bn = b.getEmployeeName() == null ? "" : b.getEmployeeName();
                    return an.compareToIgnoreCase(bn);
                })
                .toList();
    }

    private void validateRequest(ExtraHoursRequestDTO request) {
        if (request == null) throw new RuntimeException("Request cannot be null");
        if (request.getEmployeeCode() == null || request.getEmployeeCode().trim().isEmpty()) {
            throw new RuntimeException("Employee code is required");
        }
        if (request.getDate() == null) throw new RuntimeException("Date is required");
        if (request.getExtraHours() == null) throw new RuntimeException("Extra hours is required");
        if (request.getExtraHourRate() == null) throw new RuntimeException("Extra hour rate is required");
        if (request.getExtraHours() < 0) throw new RuntimeException("Extra hours cannot be negative");
        if (request.getExtraHourRate() < 0) throw new RuntimeException("Extra hour rate cannot be negative");
    }

    private double nz(Double v) {
        return v == null ? 0.0 : v;
    }

    private ExtraHoursResponseDTO toDTO(ExtraHours e) {
        Employee emp = e.getEmployee();
        Process p = (emp != null) ? emp.getProcess() : null;

        return ExtraHoursResponseDTO.builder()
                .id(e.getId())
                .employeeCode(emp != null ? emp.getCode() : null)
                .employeeName(emp != null ? emp.getEmployeeName() : null)
                .processSerialNo(p != null ? String.valueOf(p.getSerialNo()) : null)
                .processName(p != null ? p.getProcessName() : null)
                .date(e.getDate())
                .extraHours(e.getExtraHours())
                .extraHourRate(e.getExtraHourRate())
                .amount(e.getAmount())
                .remarks(e.getRemarks())
                .build();
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    private double round3(double v) {
        return Math.round(v * 1000.0) / 1000.0;
    }
}