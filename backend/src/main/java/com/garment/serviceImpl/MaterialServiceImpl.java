package com.garment.serviceImpl;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.garment.model.Material;
import com.garment.model.MaterialGroup;
import com.garment.repository.MaterialGroupRepository;
import com.garment.repository.MaterialRepository;
import com.garment.service.MaterialService;

@Service
public class MaterialServiceImpl implements MaterialService {

    @Autowired
    private MaterialRepository materialRepository;

    @Autowired
    private MaterialGroupRepository materialGroupRepository;

    @Override
    public Material createMaterial(Material material) {

        if (material.getMaterialGroup() == null || material.getMaterialGroup().getId() == null) {
            throw new RuntimeException("Material Group is required");
        }

        MaterialGroup mg = materialGroupRepository.findById(material.getMaterialGroup().getId())
                .orElseThrow(() -> new RuntimeException("Material Group not found"));

        material.setMaterialGroup(mg);

        return materialRepository.save(material);
    }

    @Override
    public List<Material> getAllMaterials() {
        return materialRepository.findAll();
    }

    @Override
    public Material getMaterialById(Long id) {
        return materialRepository.findById(id).orElse(null);
    }

    @Override
    public Material updateMaterial(Long id, Material material) {

        return materialRepository.findById(id).map(existing -> {
            existing.setSerialNumber(material.getSerialNumber());
            existing.setMaterialName(material.getMaterialName());
            existing.setCode(material.getCode());
            existing.setMaterialUnit(material.getMaterialUnit());
            existing.setMinimumStock(material.getMinimumStock());
            existing.setMaximumStock(material.getMaximumStock());
            existing.setOpeningStock(material.getOpeningStock());

            // ✅ Update Material Group if provided
            if (material.getMaterialGroup() != null && material.getMaterialGroup().getId() != null) {
                MaterialGroup mg = materialGroupRepository.findById(material.getMaterialGroup().getId())
                        .orElseThrow(() -> new RuntimeException("Material Group not found"));
                existing.setMaterialGroup(mg);
            }

            return materialRepository.save(existing);
        }).orElseThrow(() -> new RuntimeException("Material not found"));
    }

    @Override
    public void deleteMaterial(Long id) {

        if (id == null) {
            throw new IllegalArgumentException("Material id must not be null");
        }

        materialRepository.deleteById(id);
    }
}
