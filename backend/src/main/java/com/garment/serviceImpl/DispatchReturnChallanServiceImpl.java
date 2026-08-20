package com.garment.serviceImpl;

import java.time.LocalDate;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.garment.DTO.DispatchReturnChallanDTO;
import com.garment.DTO.DispatchReturnPackingRowDTO;
import com.garment.DTO.DispatchReturnRowDTO;
import com.garment.DTO.NextDispatchNumbersDTO;
import com.garment.model.DispatchReturnChallan;
import com.garment.model.DispatchReturnPackingRow;
import com.garment.model.DispatchReturnRow;
import com.garment.repository.DispatchReturnChallanRepository;
import com.garment.service.DispatchReturnChallanService;

@Service
@Transactional
public class DispatchReturnChallanServiceImpl implements DispatchReturnChallanService {

    private final DispatchReturnChallanRepository repository;

    // Serial format: DRC-YYYY/00001
    private static final String SERIAL_PREFIX = "DRC";

    private static final Pattern SERIAL_PATTERN =
            Pattern.compile("^([A-Z]+)-(\\d{4})/(\\d+)$"); // PREFIX-YYYY/SEQ

    private static final Pattern CHALLAN_PATTERN =
            Pattern.compile("^(\\d{4})/(\\d+)$"); // YYYY/SEQ

    public DispatchReturnChallanServiceImpl(DispatchReturnChallanRepository repository) {
        this.repository = repository;
    }

    // ----------------- CREATE -----------------
    @Override
    public DispatchReturnChallanDTO create(DispatchReturnChallanDTO dto) {
        DispatchReturnChallan entity = new DispatchReturnChallan();

        // Copy request fields (DO NOT copy serial/challan seq/year from client)
        copyDtoToEntity(dto, entity);

        LocalDate date = entity.getDate() != null ? entity.getDate() : LocalDate.now();
        entity.setDate(date);

        // Generate numbers
        NextDispatchNumbersDTO next = getNextNumbers(date, entity.getPartyName(), entity.getBrokerName());
        entity.setSerialNo(next.getSerialNo());
        entity.setChallanNo(next.getChallanNo());

        // IMPORTANT: Fill NOT NULL numeric columns from generated strings
        ParsedSerial ps = parseSerial(next.getSerialNo());
        if (ps == null) {
            throw new IllegalStateException("Invalid generated serialNo: " + next.getSerialNo());
        }
        entity.setSerialYear(ps.year);
        entity.setSerialSeq(ps.seq);

        ParsedChallan pc = parseChallanNo(next.getChallanNo());
        if (pc == null) {
            throw new IllegalStateException("Invalid generated challanNo: " + next.getChallanNo());
        }
        entity.setChallanYear(pc.year);
        entity.setChallanSeq(pc.seq);

        DispatchReturnChallan saved = repository.save(entity);
        return mapToDto(saved);
    }

    // ----------------- UPDATE -----------------
    @Override
    public DispatchReturnChallanDTO update(Long id, DispatchReturnChallanDTO dto) {
        DispatchReturnChallan existing = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dispatch return challan not found: " + id));

        // Preserve generated numbers (client must not change them)
        String existingSerialNo = existing.getSerialNo();
        Integer existingSerialYear = existing.getSerialYear();
        Integer existingSerialSeq = existing.getSerialSeq();

        String existingChallanNo = existing.getChallanNo();
        Integer existingChallanYear = existing.getChallanYear();
        Integer existingChallanSeq = existing.getChallanSeq();

        // Copy editable fields (ignores seq/year)
        copyDtoToEntity(dto, existing);

        // Restore preserved values
        existing.setSerialNo(existingSerialNo);
        existing.setSerialYear(existingSerialYear);
        existing.setSerialSeq(existingSerialSeq);

        existing.setChallanNo(existingChallanNo);
        existing.setChallanYear(existingChallanYear);
        existing.setChallanSeq(existingChallanSeq);

        DispatchReturnChallan saved = repository.save(existing);
        return mapToDto(saved);
    }

    // ----------------- READ -----------------
    @Override
    @Transactional(readOnly = true)
    public DispatchReturnChallanDTO getById(Long id) {
        DispatchReturnChallan entity = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dispatch return challan not found: " + id));
        return mapToDto(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DispatchReturnChallanDTO> getAll() {
        return repository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // ----------------- DELETE -----------------
    @Override
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Dispatch return challan not found: " + id);
        }
        repository.deleteById(id);
    }

    // ----------------- NEXT NUMBERS -----------------
    @Override
    @Transactional(readOnly = true)
    public NextDispatchNumbersDTO getNextNumbers(LocalDate date, String partyName, String brokerName) {
        if (date == null) date = LocalDate.now();

        int year = date.getYear();
        LocalDate startOfYear = LocalDate.of(year, 1, 1);
        LocalDate endOfYear = LocalDate.of(year, 12, 31);

        List<DispatchReturnChallan> yearChallans = repository.findByDateBetween(startOfYear, endOfYear);

        String brokerKey = makeBrokerKey(brokerName, partyName);

        String nextSerialNo = generateNextSerialNoFromList(brokerKey, year, yearChallans);
        String nextChallanNo = generateNextChallanNoFromList(year, yearChallans);

        NextDispatchNumbersDTO dto = new NextDispatchNumbersDTO();
        dto.setSerialNo(nextSerialNo);
        dto.setChallanNo(nextChallanNo);
        return dto;
    }

    // ----------------- SEQUENCE HELPERS -----------------

    private String makeBrokerKey(String brokerName, String partyName) {
        String b = brokerName != null ? brokerName.trim() : "";
        String p = partyName != null ? partyName.trim() : "";
        String key = !b.isEmpty() ? b : (!p.isEmpty() ? p : "NO_BROKER");
        return key.toUpperCase();
    }

    /**
     * Serial No: broker-wise + year-wise
     * Format: DRC-YYYY/00001
     */
    private String generateNextSerialNoFromList(String brokerKey, int year, List<DispatchReturnChallan> existing) {
        int maxSeq = 0;

        for (DispatchReturnChallan ch : existing) {
            String existingKey = makeBrokerKey(ch.getBrokerName(), ch.getPartyName());
            if (!existingKey.equals(brokerKey)) continue;

            String serialNo = ch.getSerialNo();
            if (serialNo == null || serialNo.isBlank()) continue;

            ParsedSerial ps = parseSerial(serialNo);
            if (ps == null) continue;

            if (!SERIAL_PREFIX.equals(ps.prefix)) continue;
            if (ps.year != year) continue;

            if (ps.seq > maxSeq) maxSeq = ps.seq;
        }

        int nextSeq = maxSeq + 1;
        return SERIAL_PREFIX + "-" + year + "/" + String.format("%05d", nextSeq);
    }

    /**
     * Challan No: global year-wise
     * Format: YYYY/00001
     */
    private String generateNextChallanNoFromList(int year, List<DispatchReturnChallan> existing) {
        int maxSeq = 0;

        for (DispatchReturnChallan ch : existing) {
            String challanNo = ch.getChallanNo();
            if (challanNo == null || challanNo.isBlank()) continue;

            ParsedChallan pc = parseChallanNo(challanNo);
            if (pc == null) continue;

            if (pc.year != year) continue;
            if (pc.seq > maxSeq) maxSeq = pc.seq;
        }

        int nextSeq = maxSeq + 1;
        return year + "/" + String.format("%05d", nextSeq);
    }

    private static class ParsedSerial {
        final String prefix;
        final int year;
        final int seq;

        ParsedSerial(String prefix, int year, int seq) {
            this.prefix = prefix;
            this.year = year;
            this.seq = seq;
        }
    }

    private ParsedSerial parseSerial(String serialNo) {
        Matcher m = SERIAL_PATTERN.matcher(serialNo.trim());
        if (!m.matches()) return null;
        try {
            String prefix = m.group(1);
            int year = Integer.parseInt(m.group(2));
            int seq = Integer.parseInt(m.group(3));
            return new ParsedSerial(prefix, year, seq);
        } catch (Exception e) {
            return null;
        }
    }

    private static class ParsedChallan {
        final int year;
        final int seq;

        ParsedChallan(int year, int seq) {
            this.year = year;
            this.seq = seq;
        }
    }

    private ParsedChallan parseChallanNo(String challanNo) {
        Matcher m = CHALLAN_PATTERN.matcher(challanNo.trim());
        if (!m.matches()) return null;
        try {
            int year = Integer.parseInt(m.group(1));
            int seq = Integer.parseInt(m.group(2));
            return new ParsedChallan(year, seq);
        } catch (Exception e) {
            return null;
        }
    }

    // ----------------- MAPPING HELPERS -----------------

    private DispatchReturnChallanDTO mapToDto(DispatchReturnChallan entity) {
        DispatchReturnChallanDTO dto = new DispatchReturnChallanDTO();

        dto.setId(entity.getId());
        dto.setSerialNo(entity.getSerialNo());
        dto.setDate(entity.getDate());
        dto.setChallanNo(entity.getChallanNo());

        dto.setPartyName(entity.getPartyName());
        dto.setBrokerName(entity.getBrokerName());
        dto.setTransportName(entity.getTransportName());
        dto.setDispatchedBy(entity.getDispatchedBy());
        dto.setStation(entity.getStation());
        dto.setRemarks1(entity.getRemarks1());
        dto.setRemarks2(entity.getRemarks2());

        dto.setChallanYear(entity.getChallanYear());
        dto.setChallanSeq(entity.getChallanSeq());
        dto.setSerialYear(entity.getSerialYear());
        dto.setSerialSeq(entity.getSerialSeq());

        dto.setTotalAmt(entity.getTotalAmt());
        dto.setDiscount(entity.getDiscount());
        dto.setDiscountPercent(entity.getDiscountPercent());
        dto.setTax(entity.getTax());
        dto.setTaxPercent(entity.getTaxPercent());
        dto.setCartage(entity.getCartage());
        dto.setNetAmt(entity.getNetAmt());

        if (entity.getRows() != null) {
            dto.setRows(entity.getRows().stream()
                    .map(this::mapRowToDto)
                    .collect(Collectors.toList()));
        }

        if (entity.getPackingRows() != null) {
            dto.setPackingRows(entity.getPackingRows().stream()
                    .map(this::mapPackingRowToDto)
                    .collect(Collectors.toList()));
        }

        return dto;
    }

    private DispatchReturnRowDTO mapRowToDto(DispatchReturnRow row) {
        DispatchReturnRowDTO dto = new DispatchReturnRowDTO();
        dto.setId(row.getId());
        dto.setBarCode(row.getBarCode());
        dto.setBaleNo(row.getBaleNo());
        dto.setArtNo(row.getArtNo());
        dto.setDescription(row.getDescription());
        dto.setLotNumber(row.getLotNumber());
        dto.setSize(row.getSize());
        dto.setShade(row.getShade());
        dto.setBox(row.getBox());
        dto.setPcsPerBox(row.getPcsPerBox());
        dto.setPcs(row.getPcs());
        dto.setRate(row.getRate());
        dto.setAmt(row.getAmt());
        return dto;
    }

    private DispatchReturnPackingRowDTO mapPackingRowToDto(DispatchReturnPackingRow pr) {
        DispatchReturnPackingRowDTO dto = new DispatchReturnPackingRowDTO();
        dto.setId(pr.getId());
        dto.setItemName(pr.getItemName());
        dto.setQuantity(pr.getQuantity());
        return dto;
    }

    /**
     * IMPORTANT:
     * - We intentionally ignore: serialNo, challanNo, serialYear, serialSeq, challanYear, challanSeq
     *   because they are generated/preserved server-side.
     */
    private void copyDtoToEntity(DispatchReturnChallanDTO dto, DispatchReturnChallan entity) {
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
            for (DispatchReturnRowDTO rowDto : dto.getRows()) {
                DispatchReturnRow row = new DispatchReturnRow();
                row.setChallan(entity);
                row.setBarCode(rowDto.getBarCode());
                row.setBaleNo(rowDto.getBaleNo());
                row.setArtNo(rowDto.getArtNo());
                row.setDescription(rowDto.getDescription());
                row.setLotNumber(rowDto.getLotNumber());
                row.setSize(rowDto.getSize());
                row.setShade(rowDto.getShade());
                row.setBox(rowDto.getBox());
                row.setPcsPerBox(rowDto.getPcsPerBox());
                row.setPcs(rowDto.getPcs());
                row.setRate(rowDto.getRate());
                row.setAmt(rowDto.getAmt());
                entity.getRows().add(row);
            }
        }

        // Replace packing rows
        entity.getPackingRows().clear();
        if (dto.getPackingRows() != null) {
            for (DispatchReturnPackingRowDTO prDto : dto.getPackingRows()) {
                DispatchReturnPackingRow pr = new DispatchReturnPackingRow();
                pr.setChallan(entity);
                pr.setItemName(prDto.getItemName());
                pr.setQuantity(prDto.getQuantity());
                entity.getPackingRows().add(pr);
            }
        }
    }
}