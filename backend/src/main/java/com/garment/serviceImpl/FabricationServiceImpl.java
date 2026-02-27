package com.garment.serviceImpl;

import com.garment.DTO.FabricationDTO;
import com.garment.DTO.FabricationYarnDTO;
import com.garment.model.Fabrication;
import com.garment.model.FabricationYarn;
import com.garment.model.Yarn;
import com.garment.repository.FabricationRepository;
import com.garment.repository.FabricationYarnRepository;
import com.garment.repository.YarnRepository;
import com.garment.service.FabricationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class FabricationServiceImpl implements FabricationService {

    @Autowired
    private FabricationRepository fabricationRepository;

    @Autowired
    private YarnRepository yarnRepository;

    @Autowired
    private FabricationYarnRepository fabricationYarnRepository;

    private String generateSerialNo() {
        return "FAB-" + DateTimeFormatter.ofPattern("yyyyMMddHHmmss").format(LocalDateTime.now());
    }

    @Override
    public Fabrication createFabrication(FabricationDTO dto) {
        Fabrication fabrication = new Fabrication();
        fabrication.setSerialNo(dto.getSerialNo() != null ? dto.getSerialNo() : generateSerialNo());
        fabrication.setFabricName(dto.getFabricName());
        fabricationRepository.save(fabrication);

        if (dto.getYarns() != null && !dto.getYarns().isEmpty()) {
            for (FabricationYarnDTO yarnDTO : dto.getYarns()) {
                Yarn yarn = yarnRepository.findById(yarnDTO.getYarnSerialNo())
                        .orElseThrow(() -> new RuntimeException("Yarn not found: " + yarnDTO.getYarnSerialNo()));

                FabricationYarn fabricationYarn = new FabricationYarn(fabrication, yarn, yarnDTO.getPercent());
                fabricationYarnRepository.save(fabricationYarn);
            }
        }
        return fabrication;
    }

    @Override
    public Fabrication updateFabrication(String serialNo, FabricationDTO dto) {
        Fabrication fabrication = fabricationRepository.findById(serialNo)
                .orElseThrow(() -> new RuntimeException("Fabrication not found"));

        if (dto.getFabricName() != null)
            fabrication.setFabricName(dto.getFabricName());

        fabricationRepository.save(fabrication);

        // Delete old yarns and re-insert new ones
        List<FabricationYarn> oldYarns = fabricationYarnRepository.findByFabrication(fabrication);
        fabricationYarnRepository.deleteAll(oldYarns);

        if (dto.getYarns() != null && !dto.getYarns().isEmpty()) {
            for (FabricationYarnDTO yarnDTO : dto.getYarns()) {
                Yarn yarn = yarnRepository.findById(yarnDTO.getYarnSerialNo())
                        .orElseThrow(() -> new RuntimeException("Yarn not found: " + yarnDTO.getYarnSerialNo()));
                FabricationYarn fabricationYarn = new FabricationYarn(fabrication, yarn, yarnDTO.getPercent());
                fabricationYarnRepository.save(fabricationYarn);
            }
        }

        return fabrication;
    }

    @Override
    public void deleteFabrication(String serialNo) {
        Fabrication fabrication = fabricationRepository.findById(serialNo)
                .orElseThrow(() -> new RuntimeException("Fabrication not found"));

        List<FabricationYarn> yarns = fabricationYarnRepository.findByFabrication(fabrication);
        fabricationYarnRepository.deleteAll(yarns);
        fabricationRepository.delete(fabrication);
    }

    // ✅ Single, clean, correct method returning DTOs (includes yarn name)
    @Override
    public List<FabricationDTO> getAllFabricationDTOs() {
        List<Fabrication> fabrications = fabricationRepository.findAll();

        return fabrications.stream().map(f -> {
            FabricationDTO dto = new FabricationDTO();
            dto.setSerialNo(f.getSerialNo());
            dto.setFabricName(f.getFabricName());

            List<FabricationYarnDTO> yarns = fabricationYarnRepository.findByFabrication(f).stream()
                    .map(y -> {
                        FabricationYarnDTO ydto = new FabricationYarnDTO();
                        ydto.setYarnSerialNo(y.getYarn().getSerialNo());
                        ydto.setYarnName(y.getYarn().getYarnName()); // ✅ Yarn name included
                        ydto.setPercent(y.getPercent());
                        return ydto;
                    })
                    .collect(Collectors.toList());

            dto.setYarns(yarns);
            return dto;
        }).collect(Collectors.toList());
    }

    @Override
    public Fabrication getFabricationBySerialNo(String serialNo) {
        return fabricationRepository.findById(serialNo)
                .orElseThrow(() -> new RuntimeException("Fabrication not found"));
    }
}
