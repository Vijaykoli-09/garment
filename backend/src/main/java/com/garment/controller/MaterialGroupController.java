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

import com.garment.model.MaterialGroup;
import com.garment.service.MaterialGroupService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/material-groups")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class MaterialGroupController {
	private final MaterialGroupService service;

    @PostMapping
    public ResponseEntity<MaterialGroup> create(@RequestBody MaterialGroup materialGroup) {
        return ResponseEntity.ok(service.create(materialGroup));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MaterialGroup> update(@PathVariable Long id, @RequestBody MaterialGroup materialGroup) {
        return ResponseEntity.ok(service.update(id, materialGroup));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.ok("Material deleted successfully");
    }

    @GetMapping("/{id}")
    public ResponseEntity<MaterialGroup> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<MaterialGroup>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }
}
