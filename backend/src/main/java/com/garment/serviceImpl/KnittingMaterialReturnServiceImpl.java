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
public class KnittingMaterialReturnServiceImpl
        implements KnittingMaterialReturnService {

    private final KnittingMaterialReturnRepository repo;

    private final KnittingMaterialReturnRowRepository rowRepo;

    private final PartyRepository partyRepo;

    private final MaterialRepository materialRepo;

    private final ShadeRepository shadeRepo;

    // =====================================================
    // SAVE
    // =====================================================

    @Override
    @Transactional
    public KnittingMaterialReturn save(
            KnittingMaterialReturnDTO dto) {

        // ---------------------------------------------
        // REQUIRED MATERIAL PARTY
        // ---------------------------------------------
        if (dto.getPartyId() == null) {
            throw new RuntimeException(
                    "Material Party is required"
            );
        }

        Party party =
                partyRepo.findById(dto.getPartyId())
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Material Party not found"
                                )
                        );

        // ---------------------------------------------
        // CREATE RETURN
        // ---------------------------------------------
        KnittingMaterialReturn ret =
                new KnittingMaterialReturn();

        ret.setDate(dto.getDate());

        ret.setParty(party);

        ret.setChallanNo(dto.getChallanNo());

        // ---------------------------------------------
        // OPTIONAL RECEIVED RETURN PARTY
        // ---------------------------------------------
        if (dto.getReceivedPartyId() != null) {

            Party receivedParty =
                    partyRepo.findById(
                            dto.getReceivedPartyId()
                    ).orElseThrow(
                            () -> new RuntimeException(
                                    "Received Return Party not found"
                            )
                    );

            ret.setReceivedParty(
                    receivedParty
            );

        } else {

            // Important:
            // blank received party is allowed
            ret.setReceivedParty(null);
        }

        // ---------------------------------------------
        // ITEMS
        // ---------------------------------------------
        List<KnittingMaterialReturnRow> rows =
                (dto.getItems() == null
                        ? List.<KnittingMaterialReturnRowDTO>of()
                        : dto.getItems()
                )
                        .stream()
                        .map(rdto -> {

                            KnittingMaterialReturnRow r =
                                    new KnittingMaterialReturnRow();

                            r.setMaterialReturn(ret);

                            // -------------------------------------
                            // MATERIAL
                            // -------------------------------------
                            if (
                                    rdto.getMaterialId() != null
                            ) {

                                Material material =
                                        materialRepo.findById(
                                                rdto.getMaterialId()
                                        ).orElseThrow(
                                                () -> new RuntimeException(
                                                        "Material not found"
                                                )
                                        );

                                r.setMaterial(material);

                                // Unit from Material
                                r.setUnit(
                                        material.getMaterialUnit()
                                );
                            }

                            // -------------------------------------
                            // SHADE
                            // -------------------------------------
                            if (
                                    rdto.getShadeCode() != null &&
                                            !rdto.getShadeCode()
                                                    .trim()
                                                    .isEmpty()
                            ) {

                                Shade shade =
                                        shadeRepo.findById(
                                                rdto.getShadeCode()
                                        ).orElseThrow(
                                                () -> new RuntimeException(
                                                        "Shade not found"
                                                )
                                        );

                                r.setShade(shade);
                            }

                            // -------------------------------------
                            // VALUES
                            // -------------------------------------
                            r.setRolls(
                                    rdto.getRolls()
                            );

                            r.setWtPerBox(
                                    rdto.getWtPerBox()
                            );

                            r.setWeight(
                                    rdto.getWeight()
                            );

                            r.setRate(
                                    rdto.getRate()
                            );

                            r.setAmount(
                                    rdto.getAmount()
                            );

                            return r;

                        })
                        .collect(Collectors.toList());

        ret.setItems(rows);

        return repo.save(ret);
    }

    // =====================================================
    // UPDATE
    // =====================================================

    @Override
    @Transactional
    public KnittingMaterialReturn update(
            Long id,
            KnittingMaterialReturnDTO dto) {

        KnittingMaterialReturn existing =
                repo.findById(id)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Return not found"
                                )
                        );

        // ---------------------------------------------
        // REQUIRED MATERIAL PARTY
        // ---------------------------------------------
        if (dto.getPartyId() == null) {
            throw new RuntimeException(
                    "Material Party is required"
            );
        }

        Party party =
                partyRepo.findById(
                        dto.getPartyId()
                ).orElseThrow(
                        () -> new RuntimeException(
                                "Material Party not found"
                        )
                );

        existing.setDate(
                dto.getDate()
        );

        existing.setParty(
                party
        );

        existing.setChallanNo(
                dto.getChallanNo()
        );

        // ---------------------------------------------
        // OPTIONAL RECEIVED PARTY
        // ---------------------------------------------
        if (
                dto.getReceivedPartyId() != null
        ) {

            Party receivedParty =
                    partyRepo.findById(
                            dto.getReceivedPartyId()
                    ).orElseThrow(
                            () -> new RuntimeException(
                                    "Received Return Party not found"
                            )
                    );

            existing.setReceivedParty(
                    receivedParty
            );

        } else {

            // Allow blank
            existing.setReceivedParty(null);
        }

        // ---------------------------------------------
        // CLEAR OLD ROWS
        // ---------------------------------------------
        existing.getItems().clear();

        rowRepo.flush();

        // ---------------------------------------------
        // ADD NEW ROWS
        // ---------------------------------------------
        if (dto.getItems() != null) {

            for (
                    KnittingMaterialReturnRowDTO rdto
                    : dto.getItems()
            ) {

                KnittingMaterialReturnRow r =
                        new KnittingMaterialReturnRow();

                r.setMaterialReturn(
                        existing
                );

                // -------------------------------------
                // MATERIAL
                // -------------------------------------
                if (
                        rdto.getMaterialId() != null
                ) {

                    Material material =
                            materialRepo.findById(
                                    rdto.getMaterialId()
                            ).orElseThrow(
                                    () -> new RuntimeException(
                                            "Material not found"
                                    )
                            );

                    r.setMaterial(
                            material
                    );

                    r.setUnit(
                            material.getMaterialUnit()
                    );
                }

                // -------------------------------------
                // SHADE
                // -------------------------------------
                if (
                        rdto.getShadeCode() != null &&
                                !rdto.getShadeCode()
                                        .trim()
                                        .isEmpty()
                ) {

                    Shade shade =
                            shadeRepo.findById(
                                    rdto.getShadeCode()
                            ).orElseThrow(
                                    () -> new RuntimeException(
                                            "Shade not found"
                                    )
                            );

                    r.setShade(
                            shade
                    );
                }

                // -------------------------------------
                // VALUES
                // -------------------------------------
                r.setRolls(
                        rdto.getRolls()
                );

                r.setWtPerBox(
                        rdto.getWtPerBox()
                );

                r.setWeight(
                        rdto.getWeight()
                );

                r.setRate(
                        rdto.getRate()
                );

                r.setAmount(
                        rdto.getAmount()
                );

                existing
                        .getItems()
                        .add(r);
            }
        }

        return repo.save(existing);
    }

    // =====================================================
    // GET BY ID
    // =====================================================

    @Override
    public KnittingMaterialReturn getById(
            Long id) {

        return repo.findById(id)
                .orElseThrow(
                        () -> new RuntimeException(
                                "Not found"
                        )
                );
    }

    // =====================================================
    // GET ALL
    // =====================================================

    @Override
    public List<KnittingMaterialReturn> getAll() {

        return repo.findAll();
    }

    // =====================================================
    // DELETE
    // =====================================================

    @Override
    @Transactional
    public void delete(Long id) {

        KnittingMaterialReturn ret =
                repo.findById(id)
                        .orElseThrow(
                                () -> new RuntimeException(
                                        "Not found"
                                )
                        );

        rowRepo.deleteAll(
                ret.getItems()
        );

        repo.delete(ret);
    }
}