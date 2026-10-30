package com.garment.service;

import com.garment.DTO.KnittingOutwardChallanDTO;
import com.garment.DTO.KnittingOutwardChallanListDTO;
import com.garment.model.KnittingOutwardChallan;
import com.garment.DTO.PagedResponse;
import java.util.List;

public interface KnittingOutwardChallanService {
    KnittingOutwardChallan saveEntry(KnittingOutwardChallanDTO dto);
    KnittingOutwardChallan getEntry(Long id);
    List<KnittingOutwardChallan> getAllEntries();
    PagedResponse<KnittingOutwardChallanListDTO> getAllEntriesPaged(int page, int size, String search);
    String nextChallanNo();
    KnittingOutwardChallan updateEntry(Long id, KnittingOutwardChallanDTO dto);
    void deleteEntry(Long id);
}
