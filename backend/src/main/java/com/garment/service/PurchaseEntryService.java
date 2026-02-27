package com.garment.service;

import java.util.List;

import com.garment.DTO.PurchaseEntryItemDTO;
import com.garment.DTO.PurchaseEntryRequestDTO;
import com.garment.model.PurchaseEntry;

public interface PurchaseEntryService {
	PurchaseEntry saveEntry(PurchaseEntryRequestDTO dto);
    PurchaseEntry getEntry(Long id);
    List<PurchaseEntry> getAllEntries();
    PurchaseEntry updateEntry(Long id, PurchaseEntryRequestDTO dto);
    void deleteEntry(Long id);
    List<PurchaseEntryItemDTO> getItemsByParty(Long partyId);
    void issueToKnittingOutward(Long entryId);

}
