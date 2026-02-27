//package com.garment.serviceImpl;
//
//import java.time.LocalDate;
//import java.util.*;
//import java.util.stream.Collectors;
//
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Transactional;
//
//import com.garment.DTO.SaleOrderReturnDTO;
//import com.garment.DTO.SaleOrderReturnRowDTO;
//import com.garment.DTO.SaleOrderReturnSaveDTO;
//import com.garment.DTO.SaleOrderReturnSizeDetailDTO;
//import com.garment.model.*;
//import com.garment.repository.*;
//import com.garment.service.SaleOrderReturnService;
//
//import lombok.RequiredArgsConstructor;
//
//@Service
//@RequiredArgsConstructor
//@Transactional
//public class SaleOrderReturnServiceImpl implements SaleOrderReturnService {
//
//    private final SaleOrderReturnRepository repo;
//    private final SaleOrderRepository saleOrderRepo;
//    private final SaleOrderRowRepository saleOrderRowRepo;
//    private final ShadeRepository shadeRepo;
//    private final SizeRepository sizeRepo;
//
//    /* ---------- Helpers ---------- */
//    private static int toInt(String s){
//        try { return (int) Math.floor(Double.parseDouble(Objects.toString(s, "0"))); }
//        catch (Exception e){ return 0; }
//    }
//    private static LocalDate parseDate(String s){
//        try { return (s == null || s.isBlank()) ? null : LocalDate.parse(s); }
//        catch (Exception e){ return null; }
//    }
//
//    private String buildNextReturnNoInternal() {
//        int year = LocalDate.now().getYear();
//        String prefix = "RN/" + year + "-";
//        List<String> nos = repo.findReturnNosByPrefix(prefix);
//        int maxSerial = 0;
//        for (String no : nos) {
//            try {
//                String ser = no.substring(prefix.length());
//                int n = Integer.parseInt(ser);
//                if (n > maxSerial) maxSerial = n;
//            } catch (Exception ignored) {}
//        }
//        int next = maxSerial + 1;
//        return String.format("RN/%d-%04d", year, next);
//    }
//
//    private void setShade(SaleOrderReturnRow row, String shadeName){
//        if (shadeName == null || shadeName.isBlank()) {
//            row.setShade(null);
//            row.setShadeName(null);
//            return;
//        }
//        row.setShadeName(shadeName.trim());
//        shadeRepo.findByShadeNameIgnoreCase(row.getShadeName())
//                .ifPresentOrElse(row::setShade, () -> row.setShade(null));
//    }
//
//    private void fillRowFromQtyMap(SaleOrderReturnRow row, Map<String,String> qtyMap){
//        if (qtyMap == null) return;
//        for (Map.Entry<String,String> e : qtyMap.entrySet()) {
//            String name = e.getKey();
//            if (name == null || name.isBlank()) continue;
//            int qty = toInt(e.getValue());
//            SaleOrderReturnSizeDetail sd = new SaleOrderReturnSizeDetail();
//            sd.setRow(row);
//            sd.setSizeName(name);
//            Size size = sizeRepo.findBySizeNameIgnoreCase(name).orElse(null);
//            sd.setSize(size);
//            sd.setQty(qty);
//            row.addSize(sd);
//        }
//    }
//
//    private void applyTotals(SaleOrderReturn doc){
//        int totalPeti = 0;
//        int totalPcs = 0;
//        for (SaleOrderReturnRow r : doc.getRows()) {
//            int peti = Optional.ofNullable(r.getReturnPeti()).orElse(1);
//            if (r.getArtNo() != null && !r.getArtNo().isBlank()) totalPeti += peti;
//            int rowQty = r.getSizeDetails().stream()
//                    .map(sd -> Optional.ofNullable(sd.getQty()).orElse(0))
//                    .reduce(0, Integer::sum);
//            totalPcs += rowQty * peti;
//        }
//        doc.setTotalPeti(totalPeti);
//        doc.setTotalPcs(totalPcs);
//    }
//
//    // Optional safety: ensure not exceeding original per-size × peti when linked to SO row
//    private void validateDoesNotExceedOriginal(SaleOrderRow soRow, int retPeti, List<SaleOrderReturnSizeDetail> rets){
//        if (soRow == null) return;
//        int origPeti = Optional.ofNullable(soRow.getPeti()).orElse(1);
//        Map<String,Integer> orig = new HashMap<>();
//        for (SaleOrderSizeDetail sd : Optional.ofNullable(soRow.getSizeDetails()).orElse(List.of())) {
//            if (sd.getSizeName() == null) continue;
//            orig.put(sd.getSizeName().trim().toUpperCase(), Optional.ofNullable(sd.getQty()).orElse(0) * origPeti);
//        }
//        for (SaleOrderReturnSizeDetail rd : rets) {
//            String key = Optional.ofNullable(rd.getSizeName()).orElse("").trim().toUpperCase();
//            if (key.isEmpty()) continue;
//            int allowed = orig.getOrDefault(key, Integer.MAX_VALUE); // if not in orig, skip strict check
//            int asking = Optional.ofNullable(rd.getQty()).orElse(0) * (retPeti <= 0 ? 1 : retPeti);
//            if (asking > allowed) {
//                throw new IllegalArgumentException(
//                        "Return qty exceeds original for size '" + rd.getSizeName() + "' (allowed=" + allowed + ", requested=" + asking + ")"
//                );
//            }
//        }
//    }
//
//    private SaleOrderReturnDTO toDto(SaleOrderReturn doc){
//        List<SaleOrderReturnRowDTO> rowDtos = doc.getRows().stream().map(r -> {
//            String shadeCode = r.getShade() != null ? r.getShade().getShadeCode() : null;
//            List<SaleOrderReturnSizeDetailDTO> sds = r.getSizeDetails().stream().map(sd -> {
//                Long sid = sd.getSize() != null ? sd.getSize().getId() : null;
//                return new SaleOrderReturnSizeDetailDTO(sid, sd.getSizeName(), sd.getQty());
//            }).collect(Collectors.toList());
//
//            String soNo = r.getSaleOrder() != null ? r.getSaleOrder().getOrderNo() : null;
//            Long soId = r.getSaleOrder() != null ? r.getSaleOrder().getId() : null;
//            Long soRowId = r.getSaleOrderRow() != null ? r.getSaleOrderRow().getId() : null;
//
//            return new SaleOrderReturnRowDTO(
//                    r.getSno(), soId, soRowId, soNo,
//                    r.getArtSerial(), r.getArtNo(), r.getDescription(),
//                    shadeCode, r.getShadeName(),
//                    r.getReturnPeti(), r.getReason(), r.getRemarks(),
//                    sds
//            );
//        }).collect(Collectors.toList());
//
//        // If all rows belong to same SO, expose its number on doc-level (for list convenience)
//        String docSoNo = null;
//        Set<String> soNos = rowDtos.stream()
//                .map(SaleOrderReturnRowDTO::getSaleOrderNo)
//                .filter(Objects::nonNull)
//                .collect(Collectors.toSet());
//        if (soNos.size() == 1) docSoNo = soNos.iterator().next();
//
//        return new SaleOrderReturnDTO(
//                doc.getId(), doc.getReturnNo(), doc.getDated(),
//                doc.getPartyId(), doc.getPartyName(), doc.getRemarks(),
//                doc.getTotalPeti(), doc.getTotalPcs(),
//                docSoNo,
//                rowDtos
//        );
//    }
//
//    private SaleOrderReturn buildEntityFromSave(SaleOrderReturnSaveDTO dto){
//        SaleOrderReturn doc = new SaleOrderReturn();
//
//        String retNo = (dto.getReturnNo() == null || dto.getReturnNo().isBlank())
//                ? buildNextReturnNoInternal()
//                : dto.getReturnNo().trim();
//        doc.setReturnNo(retNo);
//
//        doc.setDated(parseDate(dto.getDated()));
//        doc.setPartyId(dto.getPartyId());
//        doc.setPartyName(dto.getPartyName());
//        doc.setRemarks(dto.getRemarks());
//
//        List<SaleOrderReturnSaveDTO.SaleOrderReturnSaveRowDTO> rows =
//                dto.getRows() != null ? dto.getRows() : List.of();
//
//        int i = 1;
//        for (SaleOrderReturnSaveDTO.SaleOrderReturnSaveRowDTO rr : rows) {
//            if (rr == null) continue;
//            if (rr.getArtNo() == null || rr.getArtNo().isBlank()) continue;
//
//            SaleOrderReturnRow r = new SaleOrderReturnRow();
//            r.setSno(i++);
//            r.setArtSerial(rr.getArtSerial());
//            r.setArtNo(rr.getArtNo());
//            r.setDescription(rr.getDescription());
//            r.setReturnPeti(toInt(rr.getReturnPeti()));
//            r.setReason(rr.getReason());
//            r.setRemarks(rr.getRemarks());
//
//            // shade
//            setShade(r, rr.getShade());
//
//            // link SO and SO row if provided
//            if (rr.getSaleOrderId() != null) {
//                SaleOrder so = saleOrderRepo.findById(rr.getSaleOrderId())
//                        .orElse(null);
//                r.setSaleOrder(so);
//
//                // Optional safety: enforce same party if both present
//                if (so != null && doc.getPartyId() != null && so.getPartyId() != null
//                        && !Objects.equals(so.getPartyId(), doc.getPartyId())) {
//                    throw new IllegalArgumentException("Party mismatch between Return and referenced Sale Order");
//                }
//            }
//            if (rr.getSaleOrderRowId() != null) {
//                SaleOrderRow soRow = saleOrderRowRepo.findById(rr.getSaleOrderRowId()).orElse(null);
//                r.setSaleOrderRow(soRow);
//            }
//
//            // sizes (per-size qty)
//            Map<String,String> qtyMap = rr.getSizesQty();
//            fillRowFromQtyMap(r, qtyMap);
//
//            // safety check against original (if linked)
//            if (r.getSaleOrderRow() != null) {
//                validateDoesNotExceedOriginal(r.getSaleOrderRow(),
//                        Optional.ofNullable(r.getReturnPeti()).orElse(1),
//                        r.getSizeDetails());
//            }
//
//            doc.addRow(r);
//        }
//
//        applyTotals(doc);
//        return doc;
//    }
//
//    /* ---------- API ---------- */
//    @Override
//    public String nextReturnNo() {
//        return buildNextReturnNoInternal();
//    }
//
//    @Override
//    public SaleOrderReturnDTO create(SaleOrderReturnSaveDTO dto) {
//        SaleOrderReturn doc = buildEntityFromSave(dto);
//        SaleOrderReturn saved = repo.save(doc);
//        return toDto(saved);
//    }
//
//    @Override
//    public SaleOrderReturnDTO update(Long id, SaleOrderReturnSaveDTO dto) {
//        SaleOrderReturn existing = repo.findById(id)
//                .orElseThrow(() -> new RuntimeException("Return not found"));
//
//        SaleOrderReturn fresh = buildEntityFromSave(dto);
//
//        existing.setReturnNo((dto.getReturnNo() == null || dto.getReturnNo().isBlank())
//                ? existing.getReturnNo()
//                : dto.getReturnNo().trim());
//        existing.setDated(fresh.getDated());
//        existing.setPartyId(fresh.getPartyId());
//        existing.setPartyName(fresh.getPartyName());
//        existing.setRemarks(fresh.getRemarks());
//
//        existing.getRows().clear();
//        for (SaleOrderReturnRow nr : fresh.getRows()) {
//            nr.setId(null);
//            existing.addRow(nr);
//        }
//        applyTotals(existing);
//
//        SaleOrderReturn saved = repo.save(existing);
//        return toDto(saved);
//    }
//
//    @Override
//    @Transactional(readOnly = true)
//    public SaleOrderReturnDTO get(Long id) {
//        return repo.findById(id).map(this::toDto).orElseThrow(() -> new RuntimeException("Not found"));
//    }
//
//    @Override
//    @Transactional(readOnly = true)
//    public List<SaleOrderReturnDTO> list() {
//        return repo.findAll().stream().map(this::toDto).collect(Collectors.toList());
//    }
//
//    @Override
//    public void delete(Long id) {
//        repo.deleteById(id);
//    }
//}