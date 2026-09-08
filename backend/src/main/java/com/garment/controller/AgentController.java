package com.garment.controller;

import com.garment.model.Agent;
import com.garment.service.AgentService;
import com.garment.service.PinAuthOutcome;
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
    // Mobile "Broker Login" — Step 1: phone lookup only. Tells the app
    // whether to route to PIN setup (first time) or PIN login
    // (returning). Never returns the agent record or a token.
    // Already public via SecurityConfig's "/api/agent/**" permitAll rule.
    //
    // GET /api/agent/check-phone/{contactNo}
    //   200 { "exists": true,  "hasPinSet": true|false }
    //   200 { "exists": false }
    // ══════════════════════════════════════════════════════════════════
    @GetMapping("/check-phone/{contactNo}")
    public ResponseEntity<Map<String, Object>> checkPhone(@PathVariable String contactNo) {
        return ResponseEntity.ok(service.checkPhone(contactNo));
    }

    // ══════════════════════════════════════════════════════════════════
    // Step 2a — first-time PIN setup.
    // POST /api/agent/set-pin   Body: { "contactNo": "...", "pin": "1234" }
    //   200 { token, agent }
    //   404 { code: "AGENT_NOT_FOUND" }
    //   409 { code: "PIN_ALREADY_SET" }
    //   400 { code: "INVALID_PIN_FORMAT" }
    // ══════════════════════════════════════════════════════════════════
    @PostMapping("/set-pin")
    public ResponseEntity<Map<String, Object>> setPin(@RequestBody Map<String, String> body) {
        PinAuthOutcome outcome = service.setPin(body.get("contactNo"), body.get("pin"));
        return ResponseEntity.status(outcome.httpStatus()).body(outcome.body());
    }

    // ══════════════════════════════════════════════════════════════════
    // Step 2b — returning broker login.
    // POST /api/agent/verify-pin   Body: { "contactNo": "...", "pin": "1234" }
    //   200 { token, agent }
    //   401 { code: "INVALID_PIN", attemptsRemaining }
    //   423 { code: "PIN_LOCKED" }
    // ══════════════════════════════════════════════════════════════════
    @PostMapping("/verify-pin")
    public ResponseEntity<Map<String, Object>> verifyPin(@RequestBody Map<String, String> body) {
        PinAuthOutcome outcome = service.verifyPin(body.get("contactNo"), body.get("pin"));
        return ResponseEntity.status(outcome.httpStatus()).body(outcome.body());
    }

    // ══════════════════════════════════════════════════════════════════
    // Admin reset — clears a broker's PIN so they set a new one on next
    // login. SECURITY TODO: this is currently reachable by anyone since
    // /api/agent/** is permitAll — gate this behind admin (web) auth
    // before relying on it, otherwise a locked-out attacker could just
    // reset the PIN themselves instead of calling admin.
    // POST /api/agent/{serialNo}/reset-pin
    // ══════════════════════════════════════════════════════════════════
    @PostMapping("/{serialNo}/reset-pin")
    public ResponseEntity<Map<String, Object>> resetPin(@PathVariable String serialNo) {
        PinAuthOutcome outcome = service.resetPin(serialNo);
        return ResponseEntity.status(outcome.httpStatus()).body(outcome.body());
    }
}