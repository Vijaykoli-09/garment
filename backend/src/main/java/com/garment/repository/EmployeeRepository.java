package com.garment.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.garment.model.Employee;

public interface EmployeeRepository extends JpaRepository<Employee, String> {

    // ✅ Helpful for attendance/extra-hours summary filtering
    List<Employee> findByProcess_SerialNo(String processSerialNo);
}