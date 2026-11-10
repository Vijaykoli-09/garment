package com.garment.repository;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.garment.model.Employee;

public interface EmployeeRepository extends JpaRepository<Employee, String> {

    @Override
    @EntityGraph(attributePaths = {"process", "processes"})
    List<Employee> findAll();

    @EntityGraph(attributePaths = {"process", "processes"})
    List<Employee> findByProcess_SerialNo(String processSerialNo);
}
