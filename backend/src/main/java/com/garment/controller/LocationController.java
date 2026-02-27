package com.garment.controller;

import com.garment.DTO.LocationDTO;
import com.garment.service.LocationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/locations")
@CrossOrigin(origins = "http://localhost:3000")
public class LocationController {

    private final LocationService service;

    public LocationController(LocationService service) {
        this.service = service;
    }

    @GetMapping
    public List<LocationDTO> list(@RequestParam(value = "search", required = false) String q) {
        return service.findAll(q);
    }

    @GetMapping("/{id}")
    public LocationDTO get(@PathVariable Long id) {
        return service.getById(id);
    }

    @GetMapping("/next-serial")
    public Map<String, String> nextSerial() {
        return Map.of("serialNumber", service.getNextSerial());
    }

    @PostMapping
    public ResponseEntity<LocationDTO> create(@Valid @RequestBody LocationDTO dto) {
        LocationDTO saved = service.create(dto);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public LocationDTO update(@PathVariable Long id, @Valid @RequestBody LocationDTO dto) {
        return service.update(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}