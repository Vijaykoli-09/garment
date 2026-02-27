package com.garment.serviceImpl;

import com.garment.DTO.JobInwardChallanRequest;
import com.garment.DTO.JobInwardChallanResponse;
import com.garment.model.JobInwardChallan;
import com.garment.model.JobInwardChallanRow;
import com.garment.repository.JobInwardChallanRepository;
import com.garment.service.JobInwardChallanService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class JobInwardChallanServiceImpl implements JobInwardChallanService {
    private final JobInwardChallanRepository repo;

    private final DateTimeFormatter DF = DateTimeFormatter.ISO_LOCAL_DATE;

    @Override
    @Transactional(readOnly = true)
    public List<JobInwardChallanResponse> findAll() {
        return repo.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public JobInwardChallanResponse findById(Long id) {
        JobInwardChallan entity = repo.findById(id).orElseThrow(() -> new NoSuchElementException("Inward challan not found: " + id));
        return toResponse(entity);
    }

    @Override
    public JobInwardChallanResponse save(JobInwardChallanRequest req) {
        // Basic uniqueness check for challan no (optional)
        if (req.getChallanNo() != null && repo.existsByChallanNo(req.getChallanNo())) {
            throw new IllegalArgumentException("Challan No already exists: " + req.getChallanNo());
        }
        JobInwardChallan entity = toEntity(req, null);
        JobInwardChallan saved = repo.save(entity);
        return toResponse(saved);
    }

    @Override
    public JobInwardChallanResponse update(Long id, JobInwardChallanRequest req) {
        JobInwardChallan existing = repo.findById(id).orElseThrow(() -> new NoSuchElementException("Inward challan not found: " + id));
        // If challanNo changed, optionally ensure uniqueness
        if (req.getChallanNo() != null && !req.getChallanNo().equals(existing.getChallanNo()) && repo.existsByChallanNo(req.getChallanNo())) {
            throw new IllegalArgumentException("Challan No already exists: " + req.getChallanNo());
        }
        JobInwardChallan updated = toEntity(req, existing);
        JobInwardChallan saved = repo.save(updated);
        return toResponse(saved);
    }

    @Override
    public void delete(Long id) {
        if (!repo.existsById(id)) throw new NoSuchElementException("Not found: " + id);
        repo.deleteById(id);
    }

    /* ----------------------
       Mapping helpers
       ---------------------- */

    private JobInwardChallan toEntity(JobInwardChallanRequest req, JobInwardChallan existing) {
        JobInwardChallan ch;
        if (existing == null) {
            ch = new JobInwardChallan();
        } else {
            ch = existing;
            // clear existing rows for replace
            ch.getRows().clear();
        }

        if (req.getDate() != null && !req.getDate().isBlank()) {
            ch.setDate(LocalDate.parse(req.getDate(), DF));
        } else {
            ch.setDate(null);
        }

        ch.setChallanNo(req.getChallanNo());

        // parse party id if numeric
        Long partyId = null;
        try {
            if (req.getPartyId() != null && !req.getPartyId().isBlank()) partyId = Long.parseLong(req.getPartyId());
        } catch (NumberFormatException ignored) {}
        ch.setPartyId(partyId);

        ch.setProcessId(req.getProcessId());
        ch.setArtHeader(req.getArtHeader());
        ch.setRemarks(req.getRemarks());
        ch.setAdjustLot(req.getAdjustLot());

        if (req.getRows() != null) {
            int seq = 1;
            for (JobInwardChallanRequest.RowRequest rr : req.getRows()) {
                JobInwardChallanRow row = new JobInwardChallanRow();
                row.setSeq(seq++);
                row.setCuttinglotNumber(rr.getCuttinglotNumber());
                row.setCuttingDozen(rr.getCuttingDozen());
                row.setArtNo(rr.getArtNo());
                row.setSizeName(rr.getSizeName());
                row.setPcs(rr.getPcs() == null ? null : rr.getPcs());
                row.setWastage(rr.getWastage());
                row.setRate(parseBigDecimal(rr.getRate()));
                row.setAmount(parseBigDecimal(rr.getAmount()));
                row.setInwardChallan(ch);
                ch.getRows().add(row);
            }
        }

        return ch;
    }

    private JobInwardChallanResponse toResponse(JobInwardChallan e) {
        JobInwardChallanResponse resp = JobInwardChallanResponse.builder()
                .id(e.getId())
                .date(e.getDate() == null ? null : e.getDate().format(DF))
                .challanNo(e.getChallanNo())
                .partyId(e.getPartyId() == null ? null : String.valueOf(e.getPartyId()))
                .processId(e.getProcessId())
                .artHeader(e.getArtHeader())
                .remarks(e.getRemarks())
                .adjustLot(e.getAdjustLot())
                .rows(e.getRows().stream().map(r -> JobInwardChallanResponse.RowResponse.builder()
                                .id(r.getId())
                                .seq(r.getSeq())
                                .cuttinglotNumber(r.getCuttinglotNumber())
                                .cuttingDozen(r.getCuttingDozen())
                                .artNo(r.getArtNo())
                                .sizeName(r.getSizeName())
                                .pcs(r.getPcs())
                                .wastage(r.getWastage())
                                .rate(r.getRate() == null ? null : r.getRate().toPlainString())
                                .amount(r.getAmount() == null ? null : r.getAmount().toPlainString())
                                .build())
                        .collect(Collectors.toList()))
                .build();
        return resp;
    }

    private BigDecimal parseBigDecimal(String s) {
        if (s == null) return null;
        try {
            return new BigDecimal(s);
        } catch (Exception ex) {
            try {
                return BigDecimal.valueOf(Double.parseDouble(s));
            } catch (Exception e) {
                return null;
            }
        }
    }
}
