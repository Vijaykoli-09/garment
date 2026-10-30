package com.garment.controller;

import com.garment.DTO.DyeingMaterialReturnDTO;
import com.garment.model.DyeingMaterialReturn;
import com.garment.service.DyeingMaterialReturnService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dyeing-material-return")
@CrossOrigin(origins = "http://localhost:3000")
public class DyeingMaterialReturnController {

    private final DyeingMaterialReturnService service;

    public DyeingMaterialReturnController(DyeingMaterialReturnService service) {
        this.service = service;
    }

    @PostMapping("/save")
    public ResponseEntity<DyeingMaterialReturn> save(@RequestBody DyeingMaterialReturnDTO dto) {
        DyeingMaterialReturn saved = service.save(dto);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<DyeingMaterialReturn> update(@PathVariable Long id, @RequestBody DyeingMaterialReturnDTO dto) {
        DyeingMaterialReturn updated = service.update(id, dto);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/list")
    public ResponseEntity<List<DyeingMaterialReturn>> list() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DyeingMaterialReturn> getById(@PathVariable Long id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
