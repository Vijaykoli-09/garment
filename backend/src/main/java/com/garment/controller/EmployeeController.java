package com.garment.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.garment.model.Employee;
import com.garment.service.EmployeeService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class EmployeeController {
	private final EmployeeService employeeService;

	// ✅ Create
	@PostMapping
	public ResponseEntity<Employee> createEmployee(@RequestBody Employee employee) {
		return ResponseEntity.ok(employeeService.createEmployee(employee));
	}

	// ✅ Update
	@PutMapping("/{id}")
	public ResponseEntity<Employee> updateEmployee(@PathVariable String code, @RequestBody Employee employee) {
		return ResponseEntity.ok(employeeService.updateEmployee(code, employee));
	}

	// ✅ Delete
	@DeleteMapping("/{code}")
	public ResponseEntity<String> deleteEmployee(@PathVariable String code) {
		employeeService.deleteEmployee(code);
		return ResponseEntity.ok("Employee deleted successfully.");
	}

	// ✅ Get by ID
	@GetMapping("/{id}")
	public ResponseEntity<Employee> getEmployeeById(@PathVariable String code) {
		return ResponseEntity.ok(employeeService.getEmployeeById(code));
	}

	// ✅ Get all
	@GetMapping
	public ResponseEntity<List<Employee>> getAllEmployees() {
		return ResponseEntity.ok(employeeService.getAllEmployees());
	}
}