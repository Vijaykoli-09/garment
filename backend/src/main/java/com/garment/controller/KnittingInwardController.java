package com.garment.controller;

import com.garment.model.KnittingInward;
import com.garment.service.KnittingInwardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/knitting")
@CrossOrigin(origins = "http://localhost:3000")
public class KnittingInwardController {

    private final KnittingInwardService service;

    public KnittingInwardController(KnittingInwardService service) {
        this.service = service;
    }

    @GetMapping("/list")
    public ResponseEntity<List<KnittingInward>> listAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<KnittingInward> getById(@PathVariable Long id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/save")
    public ResponseEntity<KnittingInward> save(@RequestBody KnittingInward payload) {
        KnittingInward saved = service.save(payload);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<KnittingInward> update(@PathVariable Long id, @RequestBody KnittingInward payload) {
        payload.setId(id);
        KnittingInward updated = service.update(payload);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<String> delete(@PathVariable Long id) {
        service.deleteById(id);
        return ResponseEntity.ok("Deleted");
    }

    @GetMapping("/search")
    public ResponseEntity<KnittingInward> findByChallan(@RequestParam String challanNo) {
        return service.findByChallanNo(challanNo)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
