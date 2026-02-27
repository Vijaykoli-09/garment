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

import com.garment.model.CustomerGrade;
import com.garment.service.CustomerGradeService;

@RestController
@RequestMapping("/api/grades")
@CrossOrigin(origins = "http://localhost:3000")
public class CustomerGradeController {
	private final CustomerGradeService service;

    public CustomerGradeController(CustomerGradeService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<CustomerGrade> saveGrade(@RequestBody CustomerGrade grade) {
        return ResponseEntity.ok(service.saveGrade(grade));
    }

    @PutMapping("/{serialNo}")
    public ResponseEntity<CustomerGrade> updateGrade(@PathVariable String serialNo, @RequestBody CustomerGrade grade) {
        return ResponseEntity.ok(service.updateGrade(serialNo, grade));
    }

    @GetMapping
    public ResponseEntity<List<CustomerGrade>> listGrades() {
        return ResponseEntity.ok(service.getAllGrades());
    }

    @GetMapping("/{serialNo}")
    public ResponseEntity<CustomerGrade> getGradeById(@PathVariable String serialNo) {
        return service.getGradeById(serialNo)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{serialNo}")
    public ResponseEntity<String> deleteGrade(@PathVariable String serialNo) {
        service.deleteGrade(serialNo);
        return ResponseEntity.ok("CustomerGrade deleted successfully");
    }
}
