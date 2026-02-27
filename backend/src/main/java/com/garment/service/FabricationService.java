package com.garment.service;

import com.garment.DTO.FabricationDTO;
import com.garment.model.Fabrication;
import java.util.List;

public interface FabricationService {

    Fabrication createFabrication(FabricationDTO dto);

    Fabrication updateFabrication(String serialNo, FabricationDTO dto);

    void deleteFabrication(String serialNo);

    // ✅ Return DTOs with yarn names for frontend
    List<FabricationDTO> getAllFabricationDTOs();

    Fabrication getFabricationBySerialNo(String serialNo);
}
