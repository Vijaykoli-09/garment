package com.garment.controller;

import com.garment.model.Size;

import com.garment.service.SizeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sizes")
@CrossOrigin(origins = "http://localhost:3000")
public class SizeController {

    @Autowired
    private SizeService sizeService;

    

    @PostMapping
    public Size createSize(@RequestBody Size size) {
        return sizeService.saveSize(size);
    }

    @GetMapping
    public List<Size> searchSizes(
            @RequestParam(required = false) String serialNo,
            @RequestParam(required = false) String sizeName,

            @RequestParam(required = false) String artGroup,
            @RequestParam(required = false) String artName
    ) {
        return sizeService.searchSizes(serialNo, sizeName, artGroup, artName);

    }

    @GetMapping("/{id}")
    public Size getSizeById(@PathVariable Long id) {
        return sizeService.getSizeById(id)
                .orElseThrow(() -> new RuntimeException("Size not found with id " + id));
    }

    @PutMapping("/{id}")
    public Size updateSize(@PathVariable Long id, @RequestBody Size size) {
        return sizeService.updateSize(id, size);
    }

    @DeleteMapping("/{id}")
    public String deleteSize(@PathVariable Long id) {
        sizeService.deleteSize(id);
        return "Size deleted with id " + id;
    }
}
