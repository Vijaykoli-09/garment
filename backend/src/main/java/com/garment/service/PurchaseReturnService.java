package com.garment.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.garment.DTO.PurchaseReturnItemDTO;
import com.garment.DTO.PurchaseReturnRequestDTO;
import com.garment.DTO.PurchaseReturnResponseDTO;
import com.garment.model.PurchaseReturn;

@Service
public interface PurchaseReturnService {
	 	PurchaseReturn createReturn(PurchaseReturnRequestDTO dto);
	    PurchaseReturn getReturn(Long id);
	    List<PurchaseReturnResponseDTO> getAllReturns();
	    PurchaseReturn updateReturn(Long id, PurchaseReturnRequestDTO dto);
	    void deleteReturn(Long id);

	    // helper to convert to response DTOs (optional)
	    PurchaseReturnResponseDTO toResponseDTO(PurchaseReturn pr);
	    List<PurchaseReturnItemDTO> getTemplateByParty(Long partyId);

}
