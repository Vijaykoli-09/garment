package com.garment.serviceImpl;

import java.util.List;

import org.springframework.stereotype.Service;

import com.garment.model.MaterialGroup;
import com.garment.repository.MaterialGroupRepository;
import com.garment.service.MaterialGroupService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MaterialGroupServiceImpl implements MaterialGroupService {
	private final MaterialGroupRepository repository;

    @Override
    public MaterialGroup create(MaterialGroup materialGroup) {
        return repository.save(materialGroup);
    }

    @Override
    public MaterialGroup update(Long id, MaterialGroup materialGroup) {
        MaterialGroup existing = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Material not found"));

        existing.setMaterialGroup(materialGroup.getMaterialGroup());
        existing.setMaterialType(materialGroup.getMaterialType());
        existing.setUnitOfMeasure(materialGroup.getUnitOfMeasure());
        existing.setCostOfMaterial(materialGroup.getCostOfMaterial());
        //existing.setDateOfPurchased(materialGroup.getDateOfPurchased());
        existing.setSupplierName(materialGroup.getSupplierName());

        return repository.save(existing);
    }

    @Override
    public void delete(Long id) {
        repository.deleteById(id);
    }

    @Override
    public MaterialGroup getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Material not found"));
    }

    @Override
    public List<MaterialGroup> getAll() {
        return repository.findAll();
    }
}
