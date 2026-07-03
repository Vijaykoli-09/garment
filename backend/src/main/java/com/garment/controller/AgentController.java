package com.garment.controller;

import com.garment.model.Agent;
import com.garment.service.AgentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/agent")
@CrossOrigin(originPatterns = "*")
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

    // ══════════════════════════════════════════════════════════════════
    // Mobile "Broker Login" — phone-only lookup, no password required.
    // Already public via SecurityConfig's "/api/agent/**" permitAll rule.
    //
    // GET /api/agent/check-phone/{contactNo}
    //   200 { "exists": true,  "agent": { serialNo, agentName, contactNo, ... } }
    //   200 { "exists": false }
    // ══════════════════════════════════════════════════════════════════
    @GetMapping("/check-phone/{contactNo}")
    public ResponseEntity<Map<String, Object>> checkPhone(@PathVariable String contactNo) {
        return ResponseEntity.ok(service.checkPhone(contactNo));
    }
}