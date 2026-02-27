package com.garment.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
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

import com.garment.DTO.MaterialRequestDTO;
import com.garment.DTO.MaterialResponseDTO;
import com.garment.model.Material;
import com.garment.model.MaterialGroup;
import com.garment.repository.MaterialGroupRepository;
import com.garment.service.MaterialService;

@RestController
@RequestMapping("/api/materials")
@CrossOrigin(origins = "http://localhost:3000")
public class MaterialController {
	@Autowired
    private MaterialService materialService;

    @Autowired
    private MaterialGroupRepository materialGroupRepository;

    @PostMapping
    public ResponseEntity<MaterialResponseDTO> createMaterial(@RequestBody MaterialRequestDTO dto) {
        MaterialGroup group = materialGroupRepository.findById(dto.getMaterialGroupId())
                .orElseThrow(() -> new RuntimeException("Material Group not found"));

        Material material = Material.builder()
                .serialNumber(dto.getSerialNumber())
                .materialGroup(group)
                .materialName(dto.getMaterialName())
                .code(dto.getCode())
                .materialUnit(dto.getMaterialUnit())
                .minimumStock(dto.getMinimumStock())
                .maximumStock(dto.getMaximumStock())
                .openingStock(dto.getOpeningStock()) // ✅ Add this
                .build();


        Material saved = materialService.createMaterial(material);
        return ResponseEntity.ok(mapToResponse(saved));
    }

    @GetMapping
    public ResponseEntity<List<MaterialResponseDTO>> getAllMaterials() {
        List<MaterialResponseDTO> list = materialService.getAllMaterials()
                .stream().map(this::mapToResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MaterialResponseDTO> getMaterialById(@PathVariable Long id) {
        Material material = materialService.getMaterialById(id);
        return material != null ? ResponseEntity.ok(mapToResponse(material)) : ResponseEntity.notFound().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<MaterialResponseDTO> updateMaterial(@PathVariable Long id, @RequestBody MaterialRequestDTO dto) {
        Material existing = materialService.getMaterialById(id);
        if (existing == null) return ResponseEntity.notFound().build();

        MaterialGroup group = materialGroupRepository.findById(dto.getMaterialGroupId())
                .orElseThrow(() -> new RuntimeException("Material Group not found"));

        existing.setSerialNumber(dto.getSerialNumber());
        existing.setMaterialGroup(group);
        existing.setMaterialName(dto.getMaterialName());
        existing.setCode(dto.getCode());
        existing.setMaterialUnit(dto.getMaterialUnit());
        existing.setMinimumStock(dto.getMinimumStock());
        existing.setMaximumStock(dto.getMaximumStock());
        existing.setOpeningStock(dto.getOpeningStock());

        Material updated = materialService.updateMaterial(id, existing);
        return ResponseEntity.ok(mapToResponse(updated));
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMaterial(@PathVariable Long id) {
        materialService.deleteMaterial(id);
        return ResponseEntity.noContent().build();
    }

    // Mapper
    private MaterialResponseDTO mapToResponse(Material material) {
        MaterialGroup group = material.getMaterialGroup();

        return MaterialResponseDTO.builder()
                .id(material.getId())
                .serialNumber(material.getSerialNumber())
                .materialGroupId(group != null ? group.getId() : null)
                .materialGroupName(group != null ? group.getMaterialGroup() : null)
                .materialName(material.getMaterialName())
                .code(material.getCode())
                .materialUnit(material.getMaterialUnit())
                .minimumStock(material.getMinimumStock())
                .maximumStock(material.getMaximumStock())
                .openingStock(material.getOpeningStock())
                .build();
    }
}
