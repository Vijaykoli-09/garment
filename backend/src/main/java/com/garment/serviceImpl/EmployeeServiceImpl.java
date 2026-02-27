package com.garment.serviceImpl;

import java.util.List;

import org.springframework.stereotype.Service;

import com.garment.model.Employee;
import com.garment.repository.EmployeeRepository;
import com.garment.repository.ProcessRepository;
import com.garment.service.EmployeeService;
import com.garment.model.Process;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmployeeServiceImpl implements EmployeeService {
    private final EmployeeRepository employeeRepository;
    private final ProcessRepository processRepository;

    @Override
    public Employee createEmployee(Employee employee) {
        mapProcessIfPresent(employee);
        return employeeRepository.save(employee);
    }

    @Override
    public Employee updateEmployee(String code, Employee updatedEmployee) {
        Employee existing = employeeRepository.findById(code)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        // Update all fields
        existing.setEmployeeName(updatedEmployee.getEmployeeName());
        existing.setGender(updatedEmployee.getGender());
        existing.setDateOfBirth(updatedEmployee.getDateOfBirth());
        existing.setDateOfJoining(updatedEmployee.getDateOfJoining());
        existing.setAddress(updatedEmployee.getAddress());
        existing.setSalaryType(updatedEmployee.getSalaryType());
        existing.setMonthlySalary(updatedEmployee.getMonthlySalary());
        existing.setContractorPayment(updatedEmployee.getContractorPayment());
        existing.setWorkingHours(updatedEmployee.getWorkingHours());
        existing.setContact(updatedEmployee.getContact());
        existing.setQualification(updatedEmployee.getQualification());
        existing.setOpeningBalance(updatedEmployee.getOpeningBalance());
        existing.setAsOn(updatedEmployee.getAsOn());
        existing.setUnder(updatedEmployee.getUnder());

        // Update process
        mapProcessIfPresent(updatedEmployee);
        existing.setProcess(updatedEmployee.getProcess());

        return employeeRepository.save(existing);
    }

    @Override
    public void deleteEmployee(String code) {
        if (!employeeRepository.existsById(code)) {
            throw new RuntimeException("Employee not found");
        }
        employeeRepository.deleteById(code);
    }

    @Override
    public Employee getEmployeeById(String code) {
        return employeeRepository.findById(code)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
    }

    @Override
    public List<Employee> getAllEmployees() {
        return employeeRepository.findAll();
    }

    private void mapProcessIfPresent(Employee employee) {
        if (employee.getProcess() != null && employee.getProcess().getSerialNo() != null) {
            Process process = processRepository.findById(employee.getProcess().getSerialNo())
                    .orElseThrow(() -> new RuntimeException("Process not found"));
            employee.setProcess(process);
        }
    }
}