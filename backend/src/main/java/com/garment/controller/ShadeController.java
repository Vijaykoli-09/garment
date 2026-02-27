package com.garment.controller;

import com.garment.model.Shade;
import com.garment.service.ShadeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shade")
@CrossOrigin(origins = "http://localhost:3000") // ✅ Allow React frontend
public class ShadeController {

    private final ShadeService shadeService;

    public ShadeController(ShadeService shadeService) {
        this.shadeService = shadeService;
    }

    @GetMapping("/list")
    public ResponseEntity<List<Shade>> getAllShades() {
        return ResponseEntity.ok(shadeService.getAllShades());
    }

    @PostMapping("/save")
    public ResponseEntity<Shade> saveShade(@RequestBody Shade shade) {
        return ResponseEntity.ok(shadeService.saveShade(shade));
    }

    @PutMapping("/update/{shadeCode}")
    public ResponseEntity<Shade> updateShade(
            @PathVariable String shadeCode,
            @RequestBody Shade shade) {
        return ResponseEntity.ok(shadeService.updateShade(shadeCode, shade));
    }

    @DeleteMapping("/delete/{shadeCode}")
    public ResponseEntity<String> deleteShade(@PathVariable String shadeCode) {
        shadeService.deleteShade(shadeCode);
        return ResponseEntity.ok("Shade deleted successfully");
    }

    @GetMapping("/{shadeCode}")
    public ResponseEntity<Shade> getShade(@PathVariable String shadeCode) {
        return shadeService.getShadeByCode(shadeCode)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
