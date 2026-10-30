package com.garment.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import com.garment.DTO.CuttingLotRowDTO;
import com.garment.DTO.PackingBoxSummaryDTO;
import com.garment.DTO.PackingChallanDTO;
import com.garment.DTO.PackingChallanListDTO;
import com.garment.DTO.PackingRateSummaryDTO;
import com.garment.DTO.PagedResponse;
import com.garment.model.Shade;
import com.garment.model.Size;

public interface PackingChallanService {
	PackingChallanDTO create(PackingChallanDTO dto);
    PackingChallanDTO update(String serialNo, PackingChallanDTO dto);
    PackingChallanDTO get(String serialNo);
    List<PackingChallanDTO> list();
    PagedResponse<PackingChallanListDTO> listPaged(int page, int size, String search);
    List<PackingBoxSummaryDTO> packedSizeTotals(String excludeSerial);
    List<PackingRateSummaryDTO> latestRateSummaries();
    void delete(String serialNo);

    // Lookups
    List<String> listCuttingLots();
    List<CuttingLotRowDTO> getLotDetails(String lotNo);  // ✅ using your existing DTO now
    List<Size> listSizes();
    List<Shade> listShades();

    Optional<BigDecimal> lastRateForWorkOnArt(String workOnArt);
    Optional<String> artGroupNameByArtNo(String artNo);
}
