package com.garment.controller;

import com.garment.model.Agent;
import com.garment.service.AgentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/agent")
@CrossOrigin(origins = "http://localhost:3000")
public class AgentController {

    private final AgentService service;

    public AgentController(AgentService service) {
        this.service = service;
    }

    @PostMapping("/save")
    public ResponseEntity<Agent> save(@RequestBody Agent agent) {
        return ResponseEntity.ok(service.save(agent));
    }

    @PutMapping("/update/{serialNo}")
    public ResponseEntity<Agent> update(@PathVariable String serialNo, @RequestBody Agent agent) {
        return ResponseEntity.ok(service.update(serialNo, agent));
    }

    @GetMapping("/list")
    public ResponseEntity<List<Agent>> list() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/{serialNo}")
    public ResponseEntity<Agent> getOne(@PathVariable String serialNo) {
        return ResponseEntity.ok(service.getBySerialNo(serialNo));
    }

    @DeleteMapping("/delete/{serialNo}")
    public ResponseEntity<Void> delete(@PathVariable String serialNo) {
        service.delete(serialNo);
        return ResponseEntity.noContent().build();
    }
}