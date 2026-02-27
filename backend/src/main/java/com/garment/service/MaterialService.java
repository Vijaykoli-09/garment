package com.garment.service;

import java.util.List;

import com.garment.model.Material;

public interface MaterialService {
	Material createMaterial(Material material);
    List<Material> getAllMaterials();
    Material getMaterialById(Long id);
    Material updateMaterial(Long id, Material material);
    void deleteMaterial(Long id);
}
