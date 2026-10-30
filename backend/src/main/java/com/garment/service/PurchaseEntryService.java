package com.garment.service;

import java.util.List;

import com.garment.DTO.PurchaseEntryItemDTO;
import com.garment.DTO.PurchaseEntryListDTO;
import com.garment.DTO.PurchaseEntryRequestDTO;
import com.garment.DTO.PagedResponse;
import com.garment.model.PurchaseEntry;

public interface PurchaseEntryService {
	PurchaseEntry saveEntry(PurchaseEntryRequestDTO dto);
    PurchaseEntry getEntry(Long id);
    List<PurchaseEntry> getAllEntries();
    PagedResponse<PurchaseEntryListDTO> getAllEntriesPaged(int page, int size, String search);
    PurchaseEntry updateEntry(Long id, PurchaseEntryRequestDTO dto);
    void deleteEntry(Long id);
    List<PurchaseEntryItemDTO> getItemsByParty(Long partyId);
    void issueToKnittingOutward(Long entryId);

}
