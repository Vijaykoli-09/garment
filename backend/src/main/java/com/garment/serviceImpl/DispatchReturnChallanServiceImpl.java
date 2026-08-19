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

        // DTO → Entity (serialNo/challanNo ignore)
        copyDtoToEntity(dto, entity);

        LocalDate date = entity.getDate() != null ? entity.getDate() : LocalDate.now();
        entity.setDate(date);

        // Backend generates next numbers
        NextDispatchNumbersDTO next = getNextNumbers(date, entity.getPartyName(), entity.getBrokerName());
        entity.setSerialNo(next.getSerialNo());
        entity.setChallanNo(next.getChallanNo());

        // ✅ SET YEAR + SEQ FIELDS (required by DB NOT NULL)
        ParsedSerial ps = parseSerial(next.getSerialNo());
        if (ps == null) {
            throw new IllegalStateException("Invalid serialNo generated: " + next.getSerialNo());
        }
        entity.setSerialYear(ps.year);
        entity.setSerialSeq(ps.seq);

        ParsedChallan pc = parseChallanNo(next.getChallanNo());
        if (pc == null) {
            throw new IllegalStateException("Invalid challanNo generated: " + next.getChallanNo());
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

        // keep original numbers + year/seq
        String existingSerial = existing.getSerialNo();
        String existingChallanNo = existing.getChallanNo();

        Integer existingSerialYear = existing.getSerialYear();
        Integer existingSerialSeq = existing.getSerialSeq();
        Integer existingChallanYear = existing.getChallanYear();
        Integer existingChallanSeq = existing.getChallanSeq();

        copyDtoToEntity(dto, existing);

        existing.setSerialNo(existingSerial);
        existing.setChallanNo(existingChallanNo);

        existing.setSerialYear(existingSerialYear);
        existing.setSerialSeq(existingSerialSeq);
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
        return repository.findAll()
                .stream()
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

        List<DispatchReturnChallan> yearChallans =
                repository.findByDateBetween(startOfYear, endOfYear);

        String brokerKey = makeBrokerKey(brokerName, partyName);

        String nextSerialNo = generateNextSerialNoFromList(brokerKey, year, yearChallans);
        String nextChallanNo = generateNextChallanNoFromList(year, yearChallans);

        NextDispatchNumbersDTO out = new NextDispatchNumbersDTO();
        out.setSerialNo(nextSerialNo);
        out.setChallanNo(nextChallanNo);
        return out;
    }

    // ----------------- SEQUENCE HELPERS -----------------

    private String makeBrokerKey(String brokerName, String partyName) {
        String b = brokerName != null ? brokerName.trim() : "";
        String p = partyName != null ? partyName.trim() : "";
        String key = !b.isEmpty() ? b : (!p.isEmpty() ? p : "NO_BROKER");
        return key.toUpperCase();
    }

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
        if (serialNo == null) return null;
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
        if (challanNo == null) return null;
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

        List<DispatchReturnRowDTO> rowDtos = entity.getRows() == null
                ? List.of()
                : entity.getRows().stream().map(this::mapRowToDto).collect(Collectors.toList());

        List<DispatchReturnPackingRowDTO> packingDtos = entity.getPackingRows() == null
                ? List.of()
                : entity.getPackingRows().stream().map(this::mapPackingRowToDto).collect(Collectors.toList());

        return new DispatchReturnChallanDTO(
                entity.getId(),
                entity.getSerialNo(),
                entity.getDate(),
                entity.getChallanNo(),
                entity.getPartyName(),
                entity.getBrokerName(),
                entity.getTransportName(),
                entity.getDispatchedBy(),
                entity.getStation(),
                entity.getRemarks1(),
                entity.getRemarks2(),

                entity.getSerialYear(),
                entity.getSerialSeq(),
                entity.getChallanYear(),
                entity.getChallanSeq(),

                entity.getTotalAmt(),
                entity.getDiscount(),
                entity.getDiscountPercent(),
                entity.getTax(),
                entity.getTaxPercent(),
                entity.getCartage(),
                entity.getNetAmt(),
                rowDtos,
                packingDtos
        );
    }

    private DispatchReturnRowDTO mapRowToDto(DispatchReturnRow row) {
        // TODO: implement properly (you had empty constructor before)
        return new DispatchReturnRowDTO(
                
        );
    }

    private DispatchReturnPackingRowDTO mapPackingRowToDto(DispatchReturnPackingRow pr) {
        return new DispatchReturnPackingRowDTO(
                pr.getId(),
                pr.getItemName(),
                pr.getQuantity()
        );
    }

    /**
     * NOTE: serialNo / challanNo (and seq/year) are intentionally ignored here.
     * They are generated only in create().
     */
    private void copyDtoToEntity(DispatchReturnChallanDTO dto, DispatchReturnChallan entity) {

        entity.setDate(dto.date());

        entity.setPartyName(dto.partyName());
        entity.setBrokerName(dto.brokerName());
        entity.setStation(dto.station());
        entity.setTransportName(dto.transportName());
        entity.setDispatchedBy(dto.dispatchedBy());
        entity.setRemarks1(dto.remarks1());
        entity.setRemarks2(dto.remarks2());

        entity.setTotalAmt(dto.totalAmt());
        entity.setDiscount(dto.discount());
        entity.setDiscountPercent(dto.discountPercent());
        entity.setTax(dto.tax());
        entity.setTaxPercent(dto.taxPercent());
        entity.setCartage(dto.cartage());
        entity.setNetAmt(dto.netAmt());

        // Replace rows
        entity.getRows().clear();
        if (dto.rows() != null) {
            for (DispatchReturnRowDTO rowDto : dto.rows()) {
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
        if (dto.packingRows() != null) {
            for (DispatchReturnPackingRowDTO prDto : dto.packingRows()) {
                DispatchReturnPackingRow pr = new DispatchReturnPackingRow();
                pr.setChallan(entity);
                pr.setItemName(prDto.itemName());
                pr.setQuantity(prDto.quantity());
                entity.getPackingRows().add(pr);
            }
        }
    }
}