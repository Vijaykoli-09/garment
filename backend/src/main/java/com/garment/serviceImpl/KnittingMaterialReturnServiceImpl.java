package com.garment.serviceImpl;

import com.garment.DTO.KnittingMaterialReturnDTO;
import com.garment.DTO.KnittingMaterialReturnRowDTO;
import com.garment.model.*;
import com.garment.repository.*;
import com.garment.service.KnittingMaterialReturnService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class KnittingMaterialReturnServiceImpl implements KnittingMaterialReturnService {

    private final KnittingMaterialReturnRepository repo;
    private final KnittingMaterialReturnRowRepository rowRepo;
    private final PartyRepository partyRepo;
    private final MaterialRepository materialRepo;
    private final ShadeRepository shadeRepo;

    @Override
    @Transactional
    public KnittingMaterialReturn save(KnittingMaterialReturnDTO dto) {
        Party party = partyRepo.findById(dto.getPartyId())
                .orElseThrow(() -> new RuntimeException("Party not found"));

        KnittingMaterialReturn ret = new KnittingMaterialReturn();
        ret.setDate(dto.getDate());
        ret.setParty(party);
        ret.setChallanNo(dto.getChallanNo());

        List<KnittingMaterialReturnRow> rows = dto.getItems().stream().map(rdto -> {
            KnittingMaterialReturnRow r = new KnittingMaterialReturnRow();
            r.setMaterialReturn(ret);

            if (rdto.getMaterialId() != null) {
                Material m = materialRepo.findById(rdto.getMaterialId())
                        .orElseThrow(() -> new RuntimeException("Material not found"));
                r.setMaterial(m);
                r.setUnit(m.getMaterialUnit());
            }

            if (rdto.getShadeCode() != null) {
                Shade s = shadeRepo.findById(rdto.getShadeCode())
                        .orElseThrow(() -> new RuntimeException("Shade not found"));
                r.setShade(s);
            }

            r.setRolls(rdto.getRolls());
            r.setWtPerBox(rdto.getWtPerBox());
            r.setWeight(rdto.getWeight());
            r.setRate(rdto.getRate());
            r.setAmount(rdto.getAmount());
            return r;
        }).collect(Collectors.toList());

        ret.setItems(rows);
        return repo.save(ret);
    }

    @Override
    @Transactional
    public KnittingMaterialReturn update(Long id, KnittingMaterialReturnDTO dto) {
        KnittingMaterialReturn existing = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Return not found"));

        Party party = partyRepo.findById(dto.getPartyId())
                .orElseThrow(() -> new RuntimeException("Party not found"));

        existing.setDate(dto.getDate());
        existing.setParty(party);
        existing.setChallanNo(dto.getChallanNo());

        // ✅ 1) CLEAR OLD ROWS SAFELY
        existing.getItems().clear();
        rowRepo.flush(); // VERY IMPORTANT to avoid orphan conflict

        // ✅ 2) ADD NEW ROWS & LINK EACH ROW TO PARENT
        for (KnittingMaterialReturnRowDTO rdto : dto.getItems()) {

            KnittingMaterialReturnRow r = new KnittingMaterialReturnRow();
            r.setMaterialReturn(existing); // **Important parent link**

            if (rdto.getMaterialId() != null) {
                Material m = materialRepo.findById(rdto.getMaterialId())
                        .orElseThrow(() -> new RuntimeException("Material not found"));
                r.setMaterial(m);
                r.setUnit(m.getMaterialUnit());
            }

            if (rdto.getShadeCode() != null) {
                Shade s = shadeRepo.findById(rdto.getShadeCode())
                        .orElseThrow(() -> new RuntimeException("Shade not found"));
                r.setShade(s);
            }

            r.setRolls(rdto.getRolls());
            r.setWtPerBox(rdto.getWtPerBox());
            r.setWeight(rdto.getWeight());
            r.setRate(rdto.getRate());
            r.setAmount(rdto.getAmount());

            existing.getItems().add(r); // ✅ Add one by one
        }

        return repo.save(existing);
    }


    @Override
    public KnittingMaterialReturn getById(Long id) {
        return repo.findById(id).orElseThrow(() -> new RuntimeException("Not found"));
    }

    @Override
    public List<KnittingMaterialReturn> getAll() {
        return repo.findAll();
    }

    @Override
    public void delete(Long id) {
        KnittingMaterialReturn ret = repo.findById(id).orElseThrow(() -> new RuntimeException("Not found"));
        rowRepo.deleteAll(ret.getItems());
        repo.delete(ret);
    }
}
