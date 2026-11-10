package com.garment.serviceImpl;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.garment.model.Employee;
import com.garment.model.Process;
import com.garment.repository.EmployeeRepository;
import com.garment.repository.ProcessRepository;
import com.garment.service.EmployeeService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class EmployeeServiceImpl implements EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final ProcessRepository processRepository;

    @Override
    public Employee createEmployee(Employee employee) {
        applySelectedProcesses(employee, employee);
        return employeeRepository.save(employee);
    }

    @Override
    public Employee updateEmployee(String code, Employee updatedEmployee) {
        Employee existing = employeeRepository.findById(code)
                .orElseThrow(() -> new RuntimeException("Employee not found: " + code));

        existing.setEmployeeName(updatedEmployee.getEmployeeName());
        existing.setGender(updatedEmployee.getGender());
        existing.setDateOfBirth(updatedEmployee.getDateOfBirth());
        existing.setDateOfJoining(updatedEmployee.getDateOfJoining());
        existing.setAddress(updatedEmployee.getAddress());
        existing.setSalaryType(updatedEmployee.getSalaryType());
        existing.setMonthlySalary(updatedEmployee.getMonthlySalary());
        existing.setContractorPayment(updatedEmployee.getContractorPayment());
        existing.setWorkingHours(updatedEmployee.getWorkingHours());
        existing.setHourlyRate(updatedEmployee.getHourlyRate());
        existing.setContact(updatedEmployee.getContact());
        existing.setQualification(updatedEmployee.getQualification());
        existing.setOpeningBalance(updatedEmployee.getOpeningBalance());
        existing.setAsOn(updatedEmployee.getAsOn());
        existing.setUnder(updatedEmployee.getUnder());

        applySelectedProcesses(updatedEmployee, existing);
        return employeeRepository.save(existing);
    }

    private void applySelectedProcesses(Employee source, Employee target) {
        Set<String> selectedSerialNumbers = new LinkedHashSet<>();

        if (source.getProcesses() != null) {
            source.getProcesses().stream()
                    .filter(p -> p != null && p.getSerialNo() != null && !p.getSerialNo().isBlank())
                    .map(p -> p.getSerialNo().trim())
                    .forEach(selectedSerialNumbers::add);
        }

        // Backward compatibility: older clients send only the single "process" field.
        if (selectedSerialNumbers.isEmpty()
                && source.getProcess() != null
                && source.getProcess().getSerialNo() != null
                && !source.getProcess().getSerialNo().isBlank()) {
            selectedSerialNumbers.add(source.getProcess().getSerialNo().trim());
        }

        List<Process> resolvedProcesses = processRepository.findAllById(selectedSerialNumbers);

        if (resolvedProcesses.size() != selectedSerialNumbers.size()) {
            throw new RuntimeException("One or more selected processes do not exist");
        }

        target.setProcesses(new LinkedHashSet<>(resolvedProcesses));

        // Keep the old ManyToOne column populated for existing modules that use getProcess().
        target.setProcess(resolvedProcesses.isEmpty() ? null : resolvedProcesses.get(0));
    }

    @Override
    public void deleteEmployee(String code) {
        if (!employeeRepository.existsById(code)) {
            throw new RuntimeException("Employee not found: " + code);
        }
        employeeRepository.deleteById(code);
    }

    @Override
    @Transactional(readOnly = true)
    public Employee getEmployeeById(String code) {
        return employeeRepository.findById(code)
                .orElseThrow(() -> new RuntimeException("Employee not found: " + code));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Employee> getAllEmployees() {
        List<Employee> employees = employeeRepository.findAll();

        // If the join table has not yet been backfilled, expose the old single
        // process relationship as the employee's process list in the API response.
        for (Employee employee : employees) {
            if ((employee.getProcesses() == null || employee.getProcesses().isEmpty())
                    && employee.getProcess() != null) {
                employee.setProcesses(new LinkedHashSet<>(Set.of(employee.getProcess())));
            }
        }

        return employees;
    }
}
