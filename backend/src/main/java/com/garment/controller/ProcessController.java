package com.garment.controller;

import com.garment.model.Process;
import com.garment.service.ProcessService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/process")
@CrossOrigin(origins = "http://localhost:3000") // React frontend
public class ProcessController {

    private final ProcessService service;

    public ProcessController(ProcessService service) {
        this.service = service;
    }

    @PostMapping("/save")
    public ResponseEntity<Process> saveProcess(@RequestBody Process process) {
        return ResponseEntity.ok(service.saveProcess(process));
    }

    @PutMapping("/update/{serialNo}")
    public ResponseEntity<Process> updateProcess(@PathVariable String serialNo, @RequestBody Process process) {
        return ResponseEntity.ok(service.updateProcess(serialNo, process));
    }

    @GetMapping("/list")
    public ResponseEntity<List<Process>> listProcesses() {
        return ResponseEntity.ok(service.getAllProcesses());
    }

    @GetMapping("/{serialNo}")
    public ResponseEntity<Process> getProcessByIdEntity(@PathVariable String serialNo){
        return service.getProcessById(serialNo)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/delete/{serialNo}")
    public ResponseEntity<String> deleteProcess(@PathVariable String serialNo) {
        service.deleteProcess(serialNo);
        return ResponseEntity.ok("Process deleted successfully");
    }




}

