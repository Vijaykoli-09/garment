package com.garment.service;

import com.garment.DTO.KnittingOutwardChallanDTO;
import com.garment.model.KnittingOutwardChallan;
import java.util.List;

public interface KnittingOutwardChallanService {
    KnittingOutwardChallan saveEntry(KnittingOutwardChallanDTO dto);
    KnittingOutwardChallan getEntry(Long id);
    List<KnittingOutwardChallan> getAllEntries();
    KnittingOutwardChallan updateEntry(Long id, KnittingOutwardChallanDTO dto);
    void deleteEntry(Long id);
}
