package com.garment.controller;

import com.garment.DTO.DyeingInwardDTO;
import com.garment.service.DyeingInwardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dyeing-inward")
@RequiredArgsConstructor
//@CrossOrigin(origins = "*")
@CrossOrigin(origins = "http://localhost:3000")
public class DyeingInwardController {

    private final DyeingInwardService dyeingInwardService;

    @PostMapping
    public ResponseEntity<DyeingInwardDTO> create(@RequestBody DyeingInwardDTO dto) {
        DyeingInwardDTO saved = dyeingInwardService.save(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<DyeingInwardDTO> update(@PathVariable Long id, @RequestBody DyeingInwardDTO dto) {
        DyeingInwardDTO updated = dyeingInwardService.update(id, dto);
        
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        
        return ResponseEntity.notFound().build();
    }

    @GetMapping
    public ResponseEntity<List<DyeingInwardDTO>> getAll() {
        List<DyeingInwardDTO> list = dyeingInwardService.findAll();
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DyeingInwardDTO> getById(@PathVariable Long id) {
        DyeingInwardDTO dto = dyeingInwardService.findById(id);
        
        if (dto != null) {
            return ResponseEntity.ok(dto);
        }
        
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        dyeingInwardService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}