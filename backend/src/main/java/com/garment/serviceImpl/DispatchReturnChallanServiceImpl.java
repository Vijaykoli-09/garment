package com.garment.serviceImpl;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.garment.DTO.DispatchReturnChallanRequestDTO;
import com.garment.DTO.DispatchReturnChallanResponseDTO;
import com.garment.DTO.DispatchReturnPackingRowDTO;
import com.garment.DTO.DispatchReturnRowDTO;
import com.garment.model.DispatchReturnChallan;
import com.garment.model.DispatchReturnPackingRow;
import com.garment.model.DispatchReturnRow;
import com.garment.repository.DispatchReturnChallanRepository;
import com.garment.service.DispatchReturnChallanService;

@Service
@Transactional
public class DispatchReturnChallanServiceImpl implements DispatchReturnChallanService {

    private final DispatchReturnChallanRepository repository;

    public DispatchReturnChallanServiceImpl(DispatchReturnChallanRepository repository) {
        this.repository = repository;
    }

    // ---------------- CREATE ----------------
    @Override
    public DispatchReturnChallanResponseDTO create(DispatchReturnChallanRequestDTO dto) {
        DispatchReturnChallan entity = new DispatchReturnChallan();

        copyRequestToEntity(dto, entity);

        LocalDate date = entity.getDate() != null ? entity.getDate() : LocalDate.now();
        entity.setDate(date);

        // backend generate numbers
        String nextChallanNo = generateNextChallanNo(date);
        String nextSerialNo = generateNextSerialNo(date, entity.getPartyName(), entity.getBrokerName());

        entity.setChallanNo(nextChallanNo);
        entity.setSerialNo(nextSerialNo);

        DispatchReturnChallan saved = repository.save(entity);
        return mapToResponse(saved);
    }

    // ---------------- UPDATE ----------------
    @Override
    public DispatchReturnChallanResponseDTO update(Long id, DispatchReturnChallanRequestDTO dto) {
        DispatchReturnChallan existing = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dispatch return challan not found: " + id));

        // keep old numbers
        String oldSerial = existing.getSerialNo();
        String oldChallanNo = existing.getChallanNo();

        copyRequestToEntity(dto, existing);

        existing.setSerialNo(oldSerial);
        existing.setChallanNo(oldChallanNo);

        DispatchReturnChallan saved = repository.save(existing);
        return mapToResponse(saved);
    }

    // ---------------- READ ----------------
    @Override
    @Transactional(readOnly = true)
    public DispatchReturnChallanResponseDTO getById(Long id) {
        DispatchReturnChallan entity = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dispatch return challan not found: " + id));
        return mapToResponse(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DispatchReturnChallanResponseDTO> getAll() {
        return repository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // ---------------- DELETE ----------------
    @Override
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Dispatch return challan not found: " + id);
        }
        repository.deleteById(id);
    }

    // =================================================================
    // NUMBER GENERATION (same logic style as your DispatchChallanServiceImpl)
    // challanNo: YYYY/00001 (year wise)
    // serialNo : 00001 (year + party + broker wise)  <-- matches your frontend
    // =================================================================

    private String generateNextChallanNo(LocalDate date) {
        int year = date.getYear();
        LocalDate start = LocalDate.of(year, 1, 1);
        LocalDate end = LocalDate.of(year, 12, 31);

        List<DispatchReturnChallan> yearList = repository.findByDateBetween(start, end);

        int maxSeq = 0;
        for (DispatchReturnChallan c : yearList) {
            ParsedChallanNo parsed = parseChallanNo(c.getChallanNo());
            if (parsed == null) continue;
            if (parsed.year != year) continue;
            if (parsed.seq > maxSeq) maxSeq = parsed.seq;
        }

        return year + "/" + String.format("%05d", maxSeq + 1);
    }

    private String generateNextSerialNo(LocalDate date, String partyName, String brokerName) {
        int year = date.getYear();
        LocalDate start = LocalDate.of(year, 1, 1);
        LocalDate end = LocalDate.of(year, 12, 31);

        List<DispatchReturnChallan> yearList = repository.findByDateBetween(start, end);

        String party = safe(partyName);
        String broker = safe(brokerName);

        int max = 0;
        for (DispatchReturnChallan c : yearList) {
            // same year already filtered by dateBetween
            if (!safe(c.getPartyName()).equals(party)) continue;
            if (!safe(c.getBrokerName()).equals(broker)) continue;

            Integer seq = parseSerialSeq(c.getSerialNo());
            if (seq != null && seq > max) max = seq;
        }

        return String.format("%05d", max + 1);
    }

    private String safe(String s) {
        return s == null ? "" : s.trim();
    }

    private Integer parseSerialSeq(String serialNo) {
        if (serialNo == null) return null;
        String s = serialNo.trim();
        if (s.isEmpty()) return null;
        // serial is expected "00001"
        try {
            return Integer.parseInt(s.replaceAll("\\D+", "")); // keeps it tolerant
        } catch (Exception e) {
            return null;
        }
    }

    private static class ParsedChallanNo {
        final int year;
        final int seq;
        ParsedChallanNo(int year, int seq) { this.year = year; this.seq = seq; }
    }

    private ParsedChallanNo parseChallanNo(String challanNo) {
        if (challanNo == null) return null;
        String s = challanNo.trim();
        // Expected: YYYY/00001
        try {
            String[] parts = s.split("/");
            if (parts.length != 2) return null;
            int year = Integer.parseInt(parts[0].trim());
            int seq = Integer.parseInt(parts[1].trim());
            return new ParsedChallanNo(year, seq);
        } catch (Exception e) {
            return null;
        }
    }

    // =================================================================
    // MAPPING
    // =================================================================

    private DispatchReturnChallanResponseDTO mapToResponse(DispatchReturnChallan entity) {
        DispatchReturnChallanResponseDTO dto = new DispatchReturnChallanResponseDTO();

        dto.setId(entity.getId());
        dto.setSerialNo(entity.getSerialNo());
        dto.setChallanNo(entity.getChallanNo());
        dto.setDate(entity.getDate());

        dto.setPartyName(entity.getPartyName());
        dto.setBrokerName(entity.getBrokerName());
        dto.setTransportName(entity.getTransportName());
        dto.setDispatchedBy(entity.getDispatchedBy());
        dto.setRemarks1(entity.getRemarks1());
        dto.setRemarks2(entity.getRemarks2());
        dto.setStation(entity.getStation());

        dto.setTotalAmt(entity.getTotalAmt());
        dto.setDiscount(entity.getDiscount());
        dto.setDiscountPercent(entity.getDiscountPercent());
        dto.setTax(entity.getTax());
        dto.setTaxPercent(entity.getTaxPercent());
        dto.setCartage(entity.getCartage());
        dto.setNetAmt(entity.getNetAmt());

        if (entity.getRows() != null) {
            dto.setRows(entity.getRows().stream().map(r -> {
                DispatchReturnRowDTO rd = new DispatchReturnRowDTO();
                rd.setBarCode(r.getBarCode());
                rd.setBaleNo(r.getBaleNo());
                rd.setArtNo(r.getArtNo());
                rd.setDescription(r.getDescription());
                rd.setLotNumber(r.getLotNumber());
                rd.setSize(r.getSize());
                rd.setShade(r.getShade());
                rd.setBox(r.getBox());
                rd.setPcsPerBox(r.getPcsPerBox());
                rd.setPcs(r.getPcs());
                rd.setRate(r.getRate());
                rd.setAmt(r.getAmt());
                return rd;
            }).collect(Collectors.toList()));
        }

        if (entity.getPackingRows() != null) {
            dto.setPackingRows(entity.getPackingRows().stream().map(p -> {
                DispatchReturnPackingRowDTO pd = new DispatchReturnPackingRowDTO();
                pd.setItemName(p.getItemName());
                pd.setQuantity(p.getQuantity());
                return pd;
            }).collect(Collectors.toList()));
        }

        return dto;
    }

    /**
     * IMPORTANT:
     * - serialNo/challanNo ignore on create/update (generated/kept)
     * - rows/packingRows are replaced like your DispatchChallan code
     */
    private void copyRequestToEntity(DispatchReturnChallanRequestDTO dto, DispatchReturnChallan entity) {
        entity.setDate(dto.getDate());

        entity.setPartyName(dto.getPartyName());
        entity.setBrokerName(dto.getBrokerName());
        entity.setStation(dto.getStation());
        entity.setTransportName(dto.getTransportName());
        entity.setDispatchedBy(dto.getDispatchedBy());
        entity.setRemarks1(dto.getRemarks1());
        entity.setRemarks2(dto.getRemarks2());

        entity.setTotalAmt(dto.getTotalAmt());
        entity.setDiscount(dto.getDiscount());
        entity.setDiscountPercent(dto.getDiscountPercent());
        entity.setTax(dto.getTax());
        entity.setTaxPercent(dto.getTaxPercent());
        entity.setCartage(dto.getCartage());
        entity.setNetAmt(dto.getNetAmt());

        // Replace rows
        entity.getRows().clear();
        if (dto.getRows() != null) {
            for (DispatchReturnRowDTO r : dto.getRows()) {
                DispatchReturnRow row = new DispatchReturnRow();
                row.setChallan(entity);

                row.setBarCode(r.getBarCode());
                row.setBaleNo(r.getBaleNo());
                row.setArtNo(r.getArtNo());
                row.setDescription(r.getDescription());
                row.setLotNumber(r.getLotNumber());
                row.setSize(r.getSize());
                row.setShade(r.getShade());

                row.setBox(r.getBox());
                row.setPcsPerBox(r.getPcsPerBox());
                row.setPcs(r.getPcs());
                row.setRate(r.getRate());
                row.setAmt(r.getAmt());

                entity.getRows().add(row);
            }
        }

        // Replace packing rows
        entity.getPackingRows().clear();
        if (dto.getPackingRows() != null) {
            for (DispatchReturnPackingRowDTO p : dto.getPackingRows()) {
                DispatchReturnPackingRow pr = new DispatchReturnPackingRow();
                pr.setChallan(entity);

                pr.setItemName(p.getItemName());
                pr.setQuantity(p.getQuantity());

                entity.getPackingRows().add(pr);
            }
        }
    }
}