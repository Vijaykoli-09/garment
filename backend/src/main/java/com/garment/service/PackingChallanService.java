package com.garment.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import com.garment.DTO.CuttingLotRowDTO;
import com.garment.DTO.PackingChallanDTO;
import com.garment.model.Shade;
import com.garment.model.Size;

public interface PackingChallanService {
	PackingChallanDTO create(PackingChallanDTO dto);
    PackingChallanDTO update(String serialNo, PackingChallanDTO dto);
    PackingChallanDTO get(String serialNo);
    List<PackingChallanDTO> list();
    void delete(String serialNo);

    // Lookups
    List<String> listCuttingLots();
    List<CuttingLotRowDTO> getLotDetails(String lotNo);  // ✅ using your existing DTO now
    List<Size> listSizes();
    List<Shade> listShades();

    Optional<BigDecimal> lastRateForWorkOnArt(String workOnArt);
    Optional<String> artGroupNameByArtNo(String artNo);
}
