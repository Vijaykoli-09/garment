package com.garment.controller;

import com.garment.DTO.KnittingInwardListDTO;
import com.garment.DTO.PagedResponse;
import com.garment.model.KnittingInward;
import com.garment.service.KnittingInwardService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/knitting")
@CrossOrigin(originPatterns = "*")
public class KnittingInwardController {

    private final KnittingInwardService service;

    public KnittingInwardController(KnittingInwardService service) {
        this.service = service;
    }

    @GetMapping("/list")
    public ResponseEntity<List<KnittingInward>> listAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/list/paged")
    public PagedResponse<KnittingInwardListDTO> listPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        Page<KnittingInwardListDTO> result = service.findAllPaged(page, size, search);
        return PagedResponse.of(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<KnittingInward> getById(@PathVariable Long id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/save")
    public ResponseEntity<KnittingInward> save(@RequestBody KnittingInward payload) {
        return ResponseEntity.ok(service.save(payload));
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<KnittingInward> update(@PathVariable Long id, @RequestBody KnittingInward payload) {
        return ResponseEntity.ok(service.update(id, payload));
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