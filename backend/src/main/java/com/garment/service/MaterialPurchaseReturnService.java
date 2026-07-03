package com.garment.service;

import java.util.List;

import com.garment.DTO.MaterialPurchaseReturnItemDTO;
import com.garment.DTO.MaterialPurchaseReturnRequestDTO;
import com.garment.DTO.MaterialPurchaseReturnResponseDTO;
import com.garment.model.MaterialPurchaseReturn;

public interface MaterialPurchaseReturnService {

    MaterialPurchaseReturn create(MaterialPurchaseReturnRequestDTO dto);

    MaterialPurchaseReturn get(Long id);

    List<MaterialPurchaseReturnResponseDTO> getAll();

    MaterialPurchaseReturn update(Long id, MaterialPurchaseReturnRequestDTO dto);

    void delete(Long id);

    MaterialPurchaseReturnResponseDTO toResponseDTO(MaterialPurchaseReturn pr);

    List<MaterialPurchaseReturnItemDTO> getTemplateByParty(Long partyId);
}