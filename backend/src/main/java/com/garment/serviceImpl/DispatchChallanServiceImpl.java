package com.garment.serviceImpl;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.garment.DTO.DispatchChallanDTO;
import com.garment.DTO.DispatchPackingRowDto;
import com.garment.DTO.DispatchRowDto;
import com.garment.DTO.NextDispatchNumbersDTO;
import com.garment.model.DispatchChallan;
import com.garment.model.DispatchPackingRow;
import com.garment.model.DispatchRow;
import com.garment.repository.DispatchChallanRepository;
import com.garment.service.DispatchChallanService;

@Service
@Transactional
public class DispatchChallanServiceImpl implements DispatchChallanService {

    private final DispatchChallanRepository repository;

    public DispatchChallanServiceImpl(DispatchChallanRepository repository) {
        this.repository = repository;
    }

    // ----------------- CREATE -----------------

    @Override
    public DispatchChallanDTO create(DispatchChallanDTO dto) {
        DispatchChallan entity = new DispatchChallan();

        // DTO → Entity (serialNo/challanNo yaha set nahi kar rahe)
        copyDtoToEntity(dto, entity);

        // Date null ho to aaj ki date
        LocalDate date = entity.getDate() != null ? entity.getDate() : LocalDate.now();
        entity.setDate(date);

        // Backend se next numbers nikaal lo (DB based)
        NextDispatchNumbersDTO next = getNextNumbers(date, entity.getPartyName(), entity.getBrokerName());
        entity.setSerialNo(next.getSerialNo());
        entity.setChallanNo(next.getChallanNo());

        DispatchChallan saved = repository.save(entity);
        return mapToDto(saved);
    }

    // ----------------- UPDATE -----------------

    @Override
    public DispatchChallanDTO update(Long id, DispatchChallanDTO dto) {
        DispatchChallan existing = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dispatch challan not found: " + id));

        // SerialNo / ChallanNo ko update pe change nahi karte
        // sirf baaki fields update honge
        String existingSerial = existing.getSerialNo();
        String existingChallanNo = existing.getChallanNo();

        copyDtoToEntity(dto, existing);

        existing.setSerialNo(existingSerial);
        existing.setChallanNo(existingChallanNo);

        DispatchChallan saved = repository.save(existing);
        return mapToDto(saved);
    }

    // ----------------- READ -----------------

    @Override
    @Transactional(readOnly = true)
    public DispatchChallanDTO getById(Long id) {
        DispatchChallan entity = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dispatch challan not found: " + id));
        return mapToDto(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DispatchChallanDTO> getAll() {
        return repository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // ----------------- DELETE -----------------

    @Override
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Dispatch challan not found: " + id);
        }
        repository.deleteById(id);
    }

    // ----------------- NEXT NUMBERS (for UI preview) -----------------

    @Override
    @Transactional(readOnly = true)
    public NextDispatchNumbersDTO getNextNumbers(LocalDate date, String partyName, String brokerName) {
        if (date == null) {
            date = LocalDate.now();
        }
        int year = date.getYear();
        LocalDate startOfYear = LocalDate.of(year, 1, 1);
        LocalDate endOfYear = LocalDate.of(year, 12, 31);

        // is saal ke saare challan
        List<DispatchChallan> yearChallans = repository.findByDateBetween(startOfYear, endOfYear);

        // same brokerKey logic jo serialNo ke liye chahiye
        String brokerKey = makeBrokerKey(brokerName, partyName);

        String nextSerialNo = generateNextSerialNoFromList(brokerKey, year, yearChallans);
        String nextChallanNo = generateNextChallanNoFromList(year, yearChallans);

        NextDispatchNumbersDTO dto = new NextDispatchNumbersDTO();
        dto.setSerialNo(nextSerialNo);
        dto.setChallanNo(nextChallanNo);
        return dto;
    }

    // ----------------- SEQUENCE HELPERS -----------------

    /**
     * brokerKey: brokerName > partyName > NO_BROKER (upper case)
     */
    private String makeBrokerKey(String brokerName, String partyName) {
        String b = brokerName != null ? brokerName.trim() : "";
        String p = partyName != null ? partyName.trim() : "";
        String key = !b.isEmpty() ? b : (!p.isEmpty() ? p : "NO_BROKER");
        return key.toUpperCase();
    }

    /**
     * Serial No: broker-wise + year-wise
     * Format: DC-YYYY/00001
     */
    private String generateNextSerialNoFromList(String brokerKey, int year, List<DispatchChallan> existing) {
        int maxSeq = 0;

        for (DispatchChallan dc : existing) {
            String existingKey = makeBrokerKey(dc.getBrokerName(), dc.getPartyName());
            if (!existingKey.equals(brokerKey)) {
                continue;
            }

            String serialNo = dc.getSerialNo();
            if (serialNo == null || serialNo.isBlank()) {
                continue;
            }

            // Expected: "DC-YYYY/00001"
            int slashIdx = serialNo.lastIndexOf('/');
            if (slashIdx < 0 || slashIdx + 1 >= serialNo.length()) {
                continue;
            }

            try {
                // year part "YYYY" after "DC-"
                String yearPart = serialNo.substring(3, 7);
                int serialYear = Integer.parseInt(yearPart);
                if (serialYear != year) {
                    continue;
                }
            } catch (Exception e) {
                continue;
            }

            try {
                int seq = Integer.parseInt(serialNo.substring(slashIdx + 1));
                if (seq > maxSeq) {
                    maxSeq = seq;
                }
            } catch (NumberFormatException ignored) {
            }
        }

        int nextSeq = maxSeq + 1;
        String seqStr = String.format("%05d", nextSeq);
        return "DC-" + year + "/" + seqStr;
    }

    /**
     * Challan No: global year-wise series
     * Format: YYYY/00001
     */
    private String generateNextChallanNoFromList(int year, List<DispatchChallan> existing) {
        int maxSeq = 0;

        for (DispatchChallan dc : existing) {
            String challanNo = dc.getChallanNo();
            if (challanNo == null || challanNo.isBlank()) {
                continue;
            }

            // Expected: "YYYY/00001"
            int slashIdx = challanNo.lastIndexOf('/');
            if (slashIdx < 0 || slashIdx + 1 >= challanNo.length()) {
                continue;
            }

            String yearPart = challanNo.substring(0, slashIdx);
            try {
                int challanYear = Integer.parseInt(yearPart);
                if (challanYear != year) {
                    continue;
                }
            } catch (NumberFormatException ex) {
                continue;
            }

            try {
                int seq = Integer.parseInt(challanNo.substring(slashIdx + 1));
                if (seq > maxSeq) {
                    maxSeq = seq;
                }
            } catch (NumberFormatException ignored) {
            }
        }

        int nextSeq = maxSeq + 1;
        String seqStr = String.format("%05d", nextSeq);
        return year + "/" + seqStr;
    }

    // ----------------- MAPPING HELPERS -----------------

    private DispatchChallanDTO mapToDto(DispatchChallan entity) {
        DispatchChallanDTO dto = new DispatchChallanDTO();
        dto.setId(entity.getId());
        dto.setSerialNo(entity.getSerialNo());
        dto.setDate(entity.getDate());
        dto.setChallanNo(entity.getChallanNo());
        dto.setPartyName(entity.getPartyName());
        dto.setStation(entity.getStation());
        dto.setBrokerName(entity.getBrokerName());
        dto.setTransportName(entity.getTransportName());
        dto.setDispatchedBy(entity.getDispatchedBy());
        dto.setRemarks1(entity.getRemarks1());
        dto.setRemarks2(entity.getRemarks2());
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

    private DispatchRowDto mapRowToDto(DispatchRow row) {
        DispatchRowDto dto = new DispatchRowDto();
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

    private DispatchPackingRowDto mapPackingRowToDto(DispatchPackingRow pr) {
        DispatchPackingRowDto dto = new DispatchPackingRowDto();
        dto.setId(pr.getId());
        dto.setItemName(pr.getItemName());
        dto.setQuantity(pr.getQuantity());
        return dto;
    }

    /**
     * NOTE: yahan ab serialNo/challanNo set NAHI karte.
     * Woh sirf create() me generate hote hain.
     */
    private void copyDtoToEntity(DispatchChallanDTO dto, DispatchChallan entity) {
        // entity.setSerialNo(dto.getSerialNo()); // intentionally ignored
        entity.setDate(dto.getDate());
        // entity.setChallanNo(dto.getChallanNo()); // intentionally ignored

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
            for (DispatchRowDto rowDto : dto.getRows()) {
                DispatchRow row = new DispatchRow();
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
            for (DispatchPackingRowDto prDto : dto.getPackingRows()) {
                DispatchPackingRow pr = new DispatchPackingRow();
                pr.setChallan(entity);
                pr.setItemName(prDto.getItemName());
                pr.setQuantity(prDto.getQuantity());
                entity.getPackingRows().add(pr);
            }
        }
    }

}