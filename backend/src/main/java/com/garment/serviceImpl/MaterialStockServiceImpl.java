package com.garment.serviceImpl;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.garment.DTO.MaterialStockRequestDTO;
import com.garment.DTO.MaterialStockResponseDTO;
import com.garment.model.KnittingOutwardChallanRow;
import com.garment.model.MaterialStock;
import com.garment.model.PurchaseEntryItem;
import com.garment.repository.KnittingOutwardChallanRowRepository;
import com.garment.repository.MaterialStockRepository;
import com.garment.service.MaterialStockService;

@Service
public class MaterialStockServiceImpl implements MaterialStockService {

    @Autowired
    private MaterialStockRepository stockRepo;

    @Autowired
    private KnittingOutwardChallanRowRepository outwardRepo;

    // ✅ CREDIT (Purchase Entry increases stock)
    @Override
    public void creditStock(PurchaseEntryItem entryItem) {
        if (entryItem == null || entryItem.getMaterial() == null) return;

        Long materialId = entryItem.getMaterial().getId();
        String shadeCode = entryItem.getShade() != null ? entryItem.getShade().getShadeCode() : null;
        Double qty = entryItem.getWtPerBox() != null ? entryItem.getWtPerBox() : 0.0;

        MaterialStock stock = stockRepo.findByMaterial_IdAndShade_ShadeCode(materialId, shadeCode)
            .orElseGet(() -> {
                MaterialStock s = new MaterialStock();
                s.setMaterial(entryItem.getMaterial());
                s.setShade(entryItem.getShade());
                Double opening = entryItem.getMaterial().getOpeningStock() != null 
                        ? entryItem.getMaterial().getOpeningStock().doubleValue() : 0.0;
                s.setOpeningStock(opening);
                s.setPurchase(0.0);
                s.setConsumed(0.0);
                s.setBalance(opening);
                s.setTransactionDate(LocalDate.now());
                return s;
            });

        stock.setPurchase(stock.getPurchase() + qty);
        stock.setBalance(stock.getOpeningStock() + stock.getPurchase() - stock.getConsumed());
        stockRepo.save(stock);
    }

    // ✅ DEBIT (Knitting Outward consumes material)
    @Override
    public void debitStockFromKnittingOutward(KnittingOutwardChallanRow row) {
        if (row == null || row.getMaterial() == null) return;

        Long materialId = row.getMaterial().getId();
        String shadeCode = row.getShade() != null ? row.getShade().getShadeCode() : null;

        Double qty = 0.0;
        if (row.getWtPerBox() != null) {
            qty = row.getWtPerBox().doubleValue(); // ✅ subtract qty
        } else if (row.getWeight() != null) {
            qty = row.getWeight(); // fallback
        }

        MaterialStock stock = stockRepo.findByMaterial_IdAndShade_ShadeCode(materialId, shadeCode)
            .orElseGet(() -> {
                MaterialStock s = new MaterialStock();
                s.setMaterial(row.getMaterial());
                s.setShade(row.getShade());

                Double opening = row.getMaterial().getOpeningStock() != null 
                        ? row.getMaterial().getOpeningStock().doubleValue() : 0.0;

                s.setOpeningStock(opening);
                s.setPurchase(0.0);
                s.setConsumed(0.0);
                s.setBalance(opening);
                s.setTransactionDate(LocalDate.now());
                return s;
            });

        stock.setConsumed(stock.getConsumed() + qty);
        stock.setBalance(stock.getOpeningStock() + stock.getPurchase() - stock.getConsumed());
        stockRepo.save(stock);
    }


 // ✅ REPORT = Opening + Purchase - Consumed (Use DB Consumed also)
 @Override
 public List<MaterialStockResponseDTO> getStockReport(MaterialStockRequestDTO req) {

     // 1) Parse incoming strings → LocalDate (may be null)
     LocalDate fromDate = null;
     LocalDate toDate = null;

     if (req.getFromDate() != null && !req.getFromDate().isBlank()) {
         fromDate = LocalDate.parse(req.getFromDate()); // "yyyy-MM-dd"
     }
     if (req.getToDate() != null && !req.getToDate().isBlank()) {
         toDate = LocalDate.parse(req.getToDate());
     }

     // 2) If user left fromDate empty → use very old date
     if (fromDate == null) {
         fromDate = LocalDate.of(1900, 1, 1);
     }

     // 3) If user left toDate empty → use very far future date
     //    and make upper bound exclusive
     LocalDate toDateExcl;
     if (toDate == null) {
         toDateExcl = LocalDate.of(9999, 12, 31).plusDays(1); // exclusive upper bound
     } else {
         toDateExcl = toDate.plusDays(1); // [from, to] inclusive
     }

     // 4) Call repository with NON-NULL dates
     List<MaterialStock> stocks = stockRepo.findByGroupItemAndDateRange(
             req.getGroupIds(),
             req.getItemIds(),
             fromDate,
             toDateExcl
     );

        // ✅ Fetch consumed qty from Knitting outward also
        List<Map<String, Object>> consumedList = outwardRepo.getConsumedMaterial(fromDate, toDate);
        Map<String, Double> consumedMap = consumedList.stream().collect(Collectors.toMap(
            r -> ((Number) r.get("materialId")).longValue() + "_" + 
                 (r.get("shadeCode") != null ? r.get("shadeCode") : "null"),
            r -> ((Number) r.get("consumed")).doubleValue(),
            (a, b) -> a + b
        ));

        return stocks.stream().map(stock -> {
            String key = stock.getMaterial().getId() + "_" +
                (stock.getShade() != null ? stock.getShade().getShadeCode() : "null");

            Double outwardConsumed = consumedMap.getOrDefault(key, 0.0); // from knitting outward
            Double dbConsumed = stock.getConsumed() != null ? stock.getConsumed() : 0.0; // ✅ from stock table

            // ✅ Final consumed = DB consumed + outward consumed
            Double totalConsumed = dbConsumed + outwardConsumed;

            MaterialStockResponseDTO dto = new MaterialStockResponseDTO();
            dto.setId(stock.getId());
            dto.setGroupName(stock.getMaterial().getMaterialGroup().getMaterialGroup());
            dto.setItemName(stock.getMaterial().getMaterialName());
            dto.setShadeName(stock.getShade() != null ? stock.getShade().getShadeName() : "-");
            dto.setOpeningStock(stock.getOpeningStock());
            dto.setPurchase(stock.getPurchase());
            dto.setConsumed(totalConsumed);

            // ✅ correct balance formula
            dto.setBalance(stock.getOpeningStock() + stock.getPurchase() - totalConsumed);

            return dto;
        }).collect(Collectors.toList());
    }

}
