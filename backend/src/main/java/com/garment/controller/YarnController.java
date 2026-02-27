package com.garment.controller;

import com.garment.model.Yarn;
import com.garment.service.YarnService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/yarn")
@CrossOrigin(origins = "http://localhost:3000") // allow requests from React dev server
public class YarnController {

    private final YarnService yarnService;

    public YarnController(YarnService yarnService) {
        this.yarnService = yarnService;
    }

    // GET /yarn/list
    @GetMapping("/list")
    public ResponseEntity<List<Yarn>> listAll() {
        List<Yarn> all = yarnService.findAll();
        return ResponseEntity.ok(all);
    }

    // POST /yarn/save
    @PostMapping("/save")
    public ResponseEntity<Yarn> save(@RequestBody Yarn payload) {
        // ensure defaults
        if (payload.getUnit() == null) payload.setUnit("kg");
        // payload.rate may be null or provided as numeric value
        Yarn saved = yarnService.save(payload);
        return ResponseEntity.ok(saved);
    }

    // PUT /yarn/update/{serialNo}
    @PutMapping("/update/{serialNo}")
    public ResponseEntity<Yarn> update(@PathVariable String serialNo, @RequestBody Yarn payload) {
        Yarn updated = yarnService.update(serialNo, payload);
        return ResponseEntity.ok(updated);
    }

    // DELETE /yarn/delete/{serialNo}
    @DeleteMapping("/delete/{serialNo}")
    public ResponseEntity<String> delete(@PathVariable String serialNo) {
        if (!yarnService.existsById(serialNo)) {
            // no custom exception — return 404-like message but using 200 with message or 404 status
            return ResponseEntity.status(404).body("Yarn with serialNo " + serialNo + " not found.");
        }
        yarnService.deleteById(serialNo);
        return ResponseEntity.ok("Deleted");
    }
}
