package com.garment.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.garment.model.Employee;
import com.garment.service.EmployeeService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class EmployeeController {

	private final EmployeeService employeeService;

	@PostMapping
	public ResponseEntity<Employee> createEmployee(@RequestBody Employee employee) {
		return ResponseEntity.ok(employeeService.createEmployee(employee));
	}

	@PutMapping("/{code}")
	public ResponseEntity<Employee> updateEmployee(@PathVariable String code, @RequestBody Employee employee) {
		return ResponseEntity.ok(employeeService.updateEmployee(code, employee));
	}

	@DeleteMapping("/{code}")
	public ResponseEntity<String> deleteEmployee(@PathVariable String code) {
		employeeService.deleteEmployee(code);
		return ResponseEntity.ok("Employee deleted successfully.");
	}

	@GetMapping("/{code}")
	public ResponseEntity<Employee> getEmployeeById(@PathVariable String code) {
		return ResponseEntity.ok(employeeService.getEmployeeById(code));
	}

	@GetMapping
	public ResponseEntity<List<Employee>> getAllEmployees() {
		return ResponseEntity.ok(employeeService.getAllEmployees());
	}
}
