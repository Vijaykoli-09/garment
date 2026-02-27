package com.garment.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.garment.model.Employee;

public interface EmployeeRepository extends JpaRepository<Employee, String> {


}

