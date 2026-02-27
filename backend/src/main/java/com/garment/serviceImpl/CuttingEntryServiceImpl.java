package com.garment.serviceImpl;

import com.garment.DTO.*;
import com.garment.model.*;
import com.garment.repository.CuttingEntryRepository;
import com.garment.repository.EmployeeRepository;
import com.garment.service.CuttingEntryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class CuttingEntryServiceImpl implements CuttingEntryService {

    private final CuttingEntryRepository repo;
    private final EmployeeRepository employeeRepository;

    private static String pad4(int n) { return String.format("%04d", n); }
    private static String makeSerial(int year, int seq) { return "CT-" + year + "-" + pad4(seq); }

    @Override
    @Transactional(readOnly = true)
    public String nextSerial(LocalDate date) {
        int year = (date != null ? date.getYear() : LocalDate.now().getYear());
        String prefix = "CT-" + year + "-";
        List<String> serials = repo.findSerialsByPrefix(prefix);
        int max = 0;
        for (String s : serials) {
            try {
                String[] parts = s.split("-");
                int seq = Integer.parseInt(parts[2]);
                if (seq > max) max = seq;
            } catch (Exception ignored) {}
        }
        return makeSerial(year, max + 1);
    }

    @Override
    public CuttingEntryDTO create(CuttingEntryDTO dto) {
        if (dto.getSerialNo() == null || dto.getSerialNo().isBlank()) {
            dto.setSerialNo(nextSerial(dto.getDate()));
        } else if (repo.existsBySerialNo(dto.getSerialNo())) {
            throw new RuntimeException("Serial already exists: " + dto.getSerialNo());
        }
        CuttingEntry e = toEntity(dto, new CuttingEntry());
        e.setSerialNo(dto.getSerialNo());
        repo.save(e);
        return toDTO(e);
    }

    @Override
    public CuttingEntryDTO update(String serialNo, CuttingEntryDTO dto) {
        CuttingEntry e = repo.findById(serialNo).orElseThrow(() -> new RuntimeException("Not found: " + serialNo));
        e.getLotRows().clear();
        e.getStockRows().clear();
        toEntity(dto, e);
        repo.save(e);
        return toDTO(e);
    }

    @Override
    @Transactional(readOnly = true)
    public CuttingEntryDTO get(String serialNo) {
        CuttingEntry e = repo.findById(serialNo).orElseThrow(() -> new RuntimeException("Not found: " + serialNo));
        return toDTO(e);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CuttingEntryDTO> list() {
        return repo.findAll().stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public void delete(String serialNo) {
        if (!repo.existsBySerialNo(serialNo)) return;
        repo.deleteById(serialNo);
    }

    // --------------- Mapping (with IssueTo + Branch + sanitization) ---------------

    private CuttingEntry toEntity(CuttingEntryDTO dto, CuttingEntry e) {
        e.setDate(dto.getDate());
        e.setEmployeeId(nS(dto.getEmployeeId()));
        e.setEmployeeName(nS(dto.getEmployeeName()));

        // NEW: Issue To + Branch
        String issueToNorm = normalizeIssueTo(dto.getIssueTo());
        e.setIssueTo(issueToNorm);
        if ("Outside".equals(issueToNorm)) {
            e.setIssueBranchId(dto.getIssueBranchId());
            e.setIssueBranchName(nS(dto.getIssueBranchName()));
            if (e.getIssueBranchId() == null || e.getIssueBranchName() == null || e.getIssueBranchName().isBlank()) {
                throw new RuntimeException("Issue Branch is required when Issue To = Outside");
            }
        } else {
            // Inside or null => clear branch
            e.setIssueBranchId(null);
            e.setIssueBranchName(null);
        }

        // lot rows
        if (dto.getLotRows() != null) {
            int i = 1;
            for (CuttingLotRowDTO r : dto.getLotRows()) {
                CuttingLotRow row = new CuttingLotRow();
                row.setSno(r.getSno() != null ? r.getSno() : i++);
                row.setCutLotNo(nS(r.getCutLotNo()));
                row.setArtNo(nS(r.getArtNo()));
                row.setItemName(nS(r.getItemName()));
                row.setShade(nS(r.getShade()));
                row.setPcs(nS(r.getPcs()));
                row.setRate(nS(r.getRate()));
                row.setAmount(nS(r.getAmount()));
                row.setCuttingEntry(e);
                e.getLotRows().add(row);
            }
        }

        // stock rows
        if (dto.getStockRows() != null) {
            int j = 1;
            for (CuttingStockRowDTO r : dto.getStockRows()) {
                CuttingStockRow row = new CuttingStockRow();
                row.setSno(r.getSno() != null ? r.getSno() : j++);
                row.setFinishingInwardRowId(r.getFinishingInwardRowId());
                row.setItemName(nS(r.getItemName()));
                row.setShade(nS(r.getShade()));
                row.setUnit(nS(r.getUnit()));
                row.setConsumption(nS(r.getConsumption()));
                row.setKho(nS(r.getKho()));
                row.setConsRate(nS(r.getConsRate()));
                row.setConsAmount(nS(r.getConsAmount()));
                row.setCuttingEntry(e);
                e.getStockRows().add(row);
            }
        }

        // Compute totals (including totalKho)
        computeTotals(e);
        return e;
    }

    private CuttingEntryDTO toDTO(CuttingEntry e) {
        CuttingEntryDTO dto = new CuttingEntryDTO();
        dto.setSerialNo(e.getSerialNo());
        dto.setDate(e.getDate());
        dto.setEmployeeId(outS(e.getEmployeeId()));   // sanitize "undefined"/"null" to ""
        dto.setEmployeeName(outS(e.getEmployeeName()));
        dto.setTotalPcs(e.getTotalPcs());
        dto.setTotalCuttingAmount(e.getTotalCuttingAmount());
        dto.setTotalConsumption(e.getTotalConsumption());
        dto.setTotalKho(e.getTotalKho());
        dto.setTotalConsAmount(e.getTotalConsAmount());

        // NEW: Issue To + Branch
        dto.setIssueTo(e.getIssueTo());
        dto.setIssueBranchId(e.getIssueBranchId());
        dto.setIssueBranchName(e.getIssueBranchName());

        dto.setLotRows(e.getLotRows().stream().map(r -> {
            CuttingLotRowDTO rd = new CuttingLotRowDTO();
            rd.setId(r.getId());
            rd.setSno(r.getSno());
            rd.setCutLotNo(r.getCutLotNo());
            rd.setArtNo(r.getArtNo());
            rd.setItemName(r.getItemName());
            rd.setShade(r.getShade());
            rd.setPcs(r.getPcs());
            rd.setRate(r.getRate());
            rd.setAmount(r.getAmount());
            return rd;
        }).collect(Collectors.toList()));

        dto.setStockRows(e.getStockRows().stream().map(r -> {
            CuttingStockRowDTO rd = new CuttingStockRowDTO();
            rd.setId(r.getId());
            rd.setSno(r.getSno());
            rd.setFinishingInwardRowId(r.getFinishingInwardRowId());
            rd.setItemName(r.getItemName());
            rd.setShade(r.getShade());
            rd.setUnit(r.getUnit());
            rd.setConsumption(r.getConsumption());
            rd.setKho(r.getKho());
            rd.setConsRate(r.getConsRate());
            rd.setConsAmount(r.getConsAmount());
            return rd;
        }).collect(Collectors.toList()));

        return dto;
    }

    private void computeTotals(CuttingEntry e) {
        try {
            double totalPcs = e.getLotRows().stream().mapToDouble(r -> d(r.getPcs())).sum();
            double totalCuttingAmt = e.getLotRows().stream().mapToDouble(r -> d(r.getAmount())).sum();
            double totalCons = e.getStockRows().stream().mapToDouble(r -> d(r.getConsumption())).sum();
            double totalKho = e.getStockRows().stream().mapToDouble(r -> d(r.getKho())).sum();
            double totalConsAmt = e.getStockRows().stream().mapToDouble(r -> d(r.getConsAmount())).sum();

            e.setTotalPcs(fmt(totalPcs, 0));
            e.setTotalCuttingAmount(fmt(totalCuttingAmt, 2));
            e.setTotalConsumption(fmt(totalCons, 3));
            e.setTotalKho(fmt(totalKho, 3));
            e.setTotalConsAmount(fmt(totalConsAmt, 2));
        } catch (Exception ignored) {}
    }

    // ---------- utils ----------
    private static String nS(String s) {
        if (s == null) return "";
        s = s.trim();
        if ("undefined".equalsIgnoreCase(s) || "null".equalsIgnoreCase(s)) return "";
        return s;
    }
    private static String outS(String s) {
        if (s == null) return null;
        s = s.trim();
        if ("undefined".equalsIgnoreCase(s) || "null".equalsIgnoreCase(s)) return "";
        return s;
    }
    private static double d(String s) { try { return Double.parseDouble(s); } catch (Exception e) { return 0d; } }
    private static String fmt(double v, int scale) {
        if (scale == 0) return String.valueOf((long)Math.round(v));
        return String.format("%." + scale + "f", v);
    }
    private static String normalizeIssueTo(String v) {
        if (v == null || v.isBlank()) return null;
        String s = v.trim().toLowerCase();
        if ("inside".equals(s)) return "Inside";
        if ("outside".equals(s)) return "Outside";
        throw new RuntimeException("Invalid issueTo (use Inside/Outside)");
    }
}