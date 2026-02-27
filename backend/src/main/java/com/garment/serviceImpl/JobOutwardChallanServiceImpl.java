package com.garment.serviceImpl;

import com.garment.DTO.JobOutwardChallanRequestDTO;
import com.garment.DTO.JobOutwardChallanResponseDTO;
import com.garment.DTO.JobOutwardChallanRowRequestDTO;
import com.garment.DTO.JobOutwardChallanRowResponseDTO;
import com.garment.model.CuttingLotRow;
import com.garment.model.JobOutwardChallan;
import com.garment.model.JobOutwardChallanRow;
import com.garment.model.Party;
import com.garment.model.Process;
import com.garment.repository.CuttingLotRowRepository;
import com.garment.repository.JobOutwardChallanRepository;
import com.garment.repository.PartyRepository;
import com.garment.repository.ProcessRepository;
import com.garment.service.JobOutwardChallanService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class JobOutwardChallanServiceImpl implements JobOutwardChallanService {

    private final JobOutwardChallanRepository repo;
    private final PartyRepository partyRepository;
    private final ProcessRepository processRepository;
    private final CuttingLotRowRepository cuttingLotRowRepository;

    // --- serial helpers ---
    private static String pad4(int n) { return String.format("%04d", n); }
    private static String makeSerial(int year, int seq) { return "JO-" + year + "-" + pad4(seq); }

    @Override
    @Transactional(readOnly = true)
    public String nextSerial(LocalDate date) {
        int year = (date != null ? date.getYear() : LocalDate.now().getYear());
        String prefix = "JO-" + year + "-";
        List<String> serials = repo.findSerialsByPrefix(prefix);
        int max = 0;
        for (String s : serials) {
            try {
                String[] parts = s.split("-");
                int seq = Integer.parseInt(parts[2]);
                if (seq > max) max = seq;
            } catch (Exception ignored) { }
        }
        return makeSerial(year, max + 1);
    }

    @Override
    public JobOutwardChallanResponseDTO create(JobOutwardChallanRequestDTO dto) {
        if (dto.getSerialNo() == null || dto.getSerialNo().isBlank()) {
            dto.setSerialNo(nextSerial(dto.getDate()));
        } else if (repo.existsById(dto.getSerialNo())) {
            throw new RuntimeException("Serial already exists: " + dto.getSerialNo());
        }

        JobOutwardChallan entity = toEntity(dto, new JobOutwardChallan());
        entity.setSerialNo(dto.getSerialNo());
        repo.save(entity);
        return toDTO(entity);
    }

    @Override
    public JobOutwardChallanResponseDTO update(String serialNo, JobOutwardChallanRequestDTO dto) {
        JobOutwardChallan existing = repo.findById(serialNo)
                .orElseThrow(() -> new RuntimeException("Not found: " + serialNo));

        // Clear existing rows and map new rows
        if (existing.getRows() == null) {
            existing.setRows(new ArrayList<>());
        } else {
            existing.getRows().clear();
        }

        toEntity(dto, existing);
        repo.save(existing);
        return toDTO(existing);
    }

    @Override
    @Transactional(readOnly = true)
    public JobOutwardChallanResponseDTO get(String serialNo) {
        JobOutwardChallan e = repo.findById(serialNo)
                .orElseThrow(() -> new RuntimeException("Not found: " + serialNo));
        return toDTO(e);
    }

    @Override
    @Transactional(readOnly = true)
    public List<JobOutwardChallanResponseDTO> list() {
        return repo.findAll().stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public void delete(String serialNo) {
        if (!repo.existsById(serialNo)) return;
        repo.deleteById(serialNo);
    }

    // ---------------- mapping helpers ----------------
    private JobOutwardChallan toEntity(JobOutwardChallanRequestDTO dto, JobOutwardChallan e) {
        e.setOrderChallanNo(nS(dto.getOrderChallanNo()));
        e.setDate(dto.getDate());
        e.setRemarks1(nS(dto.getRemarks1()));
        e.setRemarks2(nS(dto.getRemarks2()));

        if (dto.getPartyId() != null) {
            Party p = partyRepository.findById(dto.getPartyId()).orElse(null);
            e.setParty(p);
        } else {
            e.setParty(null);
        }

        if (dto.getProcessSerialNo() != null && !dto.getProcessSerialNo().isBlank()) {
            Process proc = processRepository.findById(dto.getProcessSerialNo()).orElse(null);
            e.setProcess(proc);
        } else {
            e.setProcess(null);
        }

        // map rows
        if (dto.getRows() != null) {
            int index = 1;
            for (JobOutwardChallanRowRequestDTO r : dto.getRows()) {
                JobOutwardChallanRow row = new JobOutwardChallanRow();
                row.setSno(r.getSno() != null ? r.getSno() : index++);
                row.setCutLotNo(nS(r.getCutLotNo()));

                // if cutLotNo present, try to auto-fill artNo and cutting dozen pcs from CuttingLotRow
                if (r.getCutLotNo() != null && !r.getCutLotNo().isBlank()) {
                    List<CuttingLotRow> lotRows = cuttingLotRowRepository.findByCutLotNoOrderBySnoAsc(r.getCutLotNo());
                    if (lotRows != null && !lotRows.isEmpty()) {
                        CuttingLotRow first = lotRows.get(0);
                        // set artNo from request if provided else from cutting lot
                        row.setArtNo((r.getArtNo() == null || r.getArtNo().isBlank()) ? nS(first.getArtNo()) : nS(r.getArtNo()));
                        // set cuttingDozenPcs from request if provided else from cutting lot 'pcs' field
                        row.setCuttingDozenPcs((r.getCuttingDozenPcs() == null || r.getCuttingDozenPcs().isBlank()) ? nS(first.getPcs()) : nS(r.getCuttingDozenPcs()));
                    } else {
                        row.setArtNo(nS(r.getArtNo()));
                        row.setCuttingDozenPcs(nS(r.getCuttingDozenPcs()));
                    }
                } else {
                    row.setArtNo(nS(r.getArtNo()));
                    row.setCuttingDozenPcs(nS(r.getCuttingDozenPcs()));
                }

                row.setSize(nS(r.getSize()));
                row.setPcs(nS(r.getPcs()));
                row.setNarration(nS(r.getNarration()));
                row.setTargetDate(r.getTargetDate());

                // set bi-directional relation (if JobOutwardChallan has rows list)
                row.setJobOutwardChallan(e);
                if (e.getRows() == null) e.setRows(new ArrayList<>());
                e.getRows().add(row);
            }
        }

        return e;
    }

    private JobOutwardChallanResponseDTO toDTO(JobOutwardChallan e) {
        JobOutwardChallanResponseDTO dto = new JobOutwardChallanResponseDTO();
        dto.setSerialNo(e.getSerialNo());
        dto.setOrderChallanNo(e.getOrderChallanNo());
        dto.setDate(e.getDate());
        dto.setRemarks1(e.getRemarks1());
        dto.setRemarks2(e.getRemarks2());
        dto.setCreatedAt(e.getCreatedAt());
        dto.setUpdatedAt(e.getUpdatedAt());

        if (e.getParty() != null) {
            dto.setPartyId(e.getParty().getId());
            dto.setPartyName(e.getParty().getPartyName());
        }

        if (e.getProcess() != null) {
            dto.setProcessSerialNo(e.getProcess().getSerialNo());
            dto.setProcessName(e.getProcess().getProcessName());
        }

        List<JobOutwardChallanRowResponseDTO> rows = new ArrayList<>();
        if (e.getRows() != null) {
            for (JobOutwardChallanRow r : e.getRows()) {
                JobOutwardChallanRowResponseDTO rd = new JobOutwardChallanRowResponseDTO();
                rd.setId(r.getId());
                rd.setSno(r.getSno());
                rd.setCutLotNo(r.getCutLotNo());
                rd.setArtNo(r.getArtNo());
                rd.setCuttingDozenPcs(r.getCuttingDozenPcs());
                rd.setSize(r.getSize());
                rd.setPcs(r.getPcs());
                rd.setNarration(r.getNarration());
                rd.setTargetDate(r.getTargetDate());
                rows.add(rd);
            }
        }
        dto.setRows(rows);
        return dto;
    }

    private static String nS(String s) { return (s == null) ? "" : s; }
    @Override
    public Object findAll() {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'findAll'");
    }
}
