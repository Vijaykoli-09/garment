// OPTIONAL helper to fetch all Finishing Inward rows for selection
// file: src/main/java/com/garment/controller/FinishingInwardRowController.java
package com.garment.controller;

import com.garment.model.FinishingInwardRow;
import com.garment.repository.FinishingInwardRowRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/finishing-inward-rows")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000","http://localhost:5173"}, allowCredentials = "true")
public class FinishingInwardRowController {
    private final FinishingInwardRowRepository repo;

    @GetMapping
    public List<FinishingInwardRow> list() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public FinishingInwardRow get(@PathVariable Long id) {
        return repo.findById(id).orElseThrow(() -> new RuntimeException("Not found"));
    }
}