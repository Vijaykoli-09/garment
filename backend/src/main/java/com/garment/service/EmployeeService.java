package com.garment.service;

import java.util.List;

import com.garment.model.Employee;

public interface EmployeeService {
    Employee createEmployee(Employee employee);

    Employee updateEmployee(String code, Employee employee);

    void deleteEmployee(String code);

    Employee getEmployeeById(String code);

    List<Employee> getAllEmployees();
}