package com.garment.service;

import com.garment.model.*;
import com.garment.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
public class KnittingInwardService {

    private final KnittingInwardRepository repo;
    private final PartyRepository partyRepo;
    private final FabricationRepository fabricationRepo;
    private final YarnRepository yarnRepo;

    public KnittingInwardService(
            KnittingInwardRepository repo,
            PartyRepository partyRepo,
            FabricationRepository fabricationRepo,
            YarnRepository yarnRepo
    ) {
        this.repo = repo;
        this.partyRepo = partyRepo;
        this.fabricationRepo = fabricationRepo;
        this.yarnRepo = yarnRepo;
    }

    private void attachParentAndRefs(KnittingInward k) {
        // attach party reference
        if (k.getParty() != null && k.getParty().getId() != null) {
            Party p = partyRepo.findById(k.getParty().getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Party not found"));
            k.setParty(p);
        }

        if (k.getRows() != null) {
            for (KnittingRow r : k.getRows()) {
                r.setKnittingInward(k);

                // attach fabrication
                if (r.getFabrication() != null && r.getFabrication().getSerialNo() != null) {
                    String serial = String.valueOf(r.getFabrication().getSerialNo());
                    Fabrication f = fabricationRepo.findById(serial)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fabrication not found: " + serial));
                    r.setFabrication(f);
                } else {
                    r.setFabrication(null);
                }

                // attach yarn
                if (r.getYarn() != null && r.getYarn().getSerialNo() != null) {
                    String ySerial = String.valueOf(r.getYarn().getSerialNo());
                    Yarn y = yarnRepo.findById(ySerial)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Yarn not found: " + ySerial));
                    r.setYarn(y);
                } else {
                    r.setYarn(null);
                }
            }
        }
    }

    public KnittingInward save(KnittingInward k) {
        // prevent challan duplicate
        if (k.getChallanNo() != null && repo.findByChallanNo(k.getChallanNo()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Challan No already exists: " + k.getChallanNo());
        }

        attachParentAndRefs(k);
        return repo.save(k);
    }

    public KnittingInward update(Long id, KnittingInward payload) {
        KnittingInward existing = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KnittingInward not found: " + id));

        existing.setChallanNo(payload.getChallanNo());
        existing.setDated(payload.getDated());
        existing.setParty(payload.getParty());
        existing.setTotalRolls(payload.getTotalRolls());
        existing.setTotalWeight(payload.getTotalWeight());
        existing.setTotalAmount(payload.getTotalAmount());

        existing.getRows().clear();
        if (payload.getRows() != null) {
            existing.getRows().addAll(payload.getRows());
        }

        attachParentAndRefs(existing);
        return repo.save(existing);
    }

    public List<KnittingInward> findAll() {
        return repo.findAll();
    }

    public Optional<KnittingInward> findById(Long id) {
        return repo.findById(id);
    }

    public void deleteById(Long id) {
        repo.deleteById(id);
    }

    public Optional<KnittingInward> findByChallanNo(String challanNo) {
        return repo.findByChallanNo(challanNo);
    }
}