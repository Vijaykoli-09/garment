package com.garment.service;

import java.util.List;

import com.garment.DTO.MaterialGroupResponseDTO;
import com.garment.model.MaterialGroup;

public interface MaterialGroupService {
	MaterialGroup create(MaterialGroup materialGroup);
    MaterialGroup update(Long id, MaterialGroup materialGroup);
    void delete(Long id);
    MaterialGroup getById(Long id);
    List<MaterialGroup> getAll();
}
