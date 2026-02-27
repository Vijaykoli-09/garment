// ========== BACKEND: Updated ArtService.java ==========

package com.garment.service;

import com.garment.DTO.ArtResponseDTO;
import com.garment.DTO.*;
import com.garment.model.*;
import com.garment.repository.ArtRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ArtService {

    private static final Logger logger = LoggerFactory.getLogger(ArtService.class);

    @Autowired
    private ArtRepository artRepository;

    public List<ArtListDTO> getAllArts() {
        return artRepository.findAll().stream()
                .map(this::convertToListDTO)
                .collect(Collectors.toList());
    }

    public ArtResponseDTO getArtBySerialNumber(String serialNumber) {
        Art art = artRepository.findBySerialNumber(serialNumber).orElse(null);
        return art != null ? convertToResponseDTO(art) : null;
    }

    @Transactional
    public ArtResponseDTO createArt(ArtRequestDTO request) {
        logger.info("Creating art with serial number: {}", request.getSerialNumber());

        Art art = new Art();
        mapRequestToEntity(request, art);

        Art savedArt = artRepository.save(art);

        logger.info("Art saved successfully.");
        logger.info("  - Processes: {}", savedArt.getProcesses().size());
        logger.info("  - Shades: {}", savedArt.getShades().size());
        logger.info("  - Sizes: {}", savedArt.getSizes().size());
        logger.info("  - Accessories: {}", savedArt.getAccessories().size());
        logger.info("  - Accessory Details: {}", savedArt.getAccessoryDetails().size());
        logger.info("  - Size Details: {}", savedArt.getSizeDetails().size());  // ADD THIS LINE

        return convertToResponseDTO(savedArt);
    }

    @Transactional
    public ArtResponseDTO updateArt(String serialNumber, ArtRequestDTO request) {
        Art art = artRepository.findBySerialNumber(serialNumber).orElse(null);
        if (art == null) {
            return null;
        }

        // Clear existing collections
        art.getProcesses().clear();
        art.getShades().clear();
        art.getSizes().clear();
        art.getAccessories().clear();
        art.getAccessoryDetails().clear();
        art.getSizeDetails().clear();  // ✅ You have this

        // Flush to database to ensure deletions are processed
        artRepository.flush();

        mapRequestToEntity(request, art);
        Art updatedArt = artRepository.save(art);

        logger.info("Art updated successfully.");
        logger.info("  - Accessory details count: {}", updatedArt.getAccessoryDetails().size());
        logger.info("  - Size details count: {}", updatedArt.getSizeDetails().size());  // ADD THIS

        return convertToResponseDTO(updatedArt);
    }

    @Transactional
    public void deleteArt(String serialNumber) {
        artRepository.deleteById(serialNumber);
    }

    private void mapRequestToEntity(ArtRequestDTO request, Art art) {
        // Set basic fields
        art.setSerialNumber(request.getSerialNumber());
        art.setArtGroup(request.getArtGroup());
        art.setArtName(request.getArtName());
        art.setArtNo(request.getArtNo());
        art.setCopyFromArtName(request.getCopyFromArtName());
        art.setStyleRate(request.getStyleRate());
        art.setSaleRate(request.getSaleRate());
        art.setStyleName(request.getStyleName());
        art.setOpeningBalance(request.getOpeningBalance());
        art.setBrandName(request.getBrandName());
        art.setWorkOnArt(request.getWorkOnArt());

        // Calculate and set rate total
        String rateTotal = calculateRateTotal(request);
        art.setRateTotal(rateTotal);
        logger.info("Calculated rate total: {}", rateTotal);

        // Map processes
        if (request.getProcesses() != null) {
            logger.info("Mapping {} processes", request.getProcesses().size());
            for (ProcessDTO processDTO : request.getProcesses()) {
                ArtProcess process = new ArtProcess();
                process.setSno(processDTO.getSno());
                process.setProcessName(processDTO.getProcessName());
                process.setRate(processDTO.getRate());
                process.setRate1(processDTO.getRate1());
                process.setSizeWid(processDTO.getSizeWid());
                process.setSizeWidAct(processDTO.getSizeWidAct());
                process.setItemRef(processDTO.getItemRef());
                process.setProcess(processDTO.getProcess());
                process.setArt(art);
                art.getProcesses().add(process);
            }
        }

        // Map shades
        if (request.getShades() != null) {
            logger.info("Mapping {} shades", request.getShades().size());
            for (ShadeDTO shadeDTO : request.getShades()) {
                ArtShade shade = new ArtShade();
                shade.setShadeCode(shadeDTO.getShadeCode());
                shade.setShadeName(shadeDTO.getShadeName());
                shade.setColorFamily(shadeDTO.getColorFamily());
                shade.setArt(art);
                art.getShades().add(shade);
            }
        }

        // Map sizes
        if (request.getSizes() != null) {
            logger.info("Mapping {} sizes", request.getSizes().size());
            for (SizeDTO sizeDTO : request.getSizes()) {
                ArtSize size = new ArtSize();
                size.setSerialNo(sizeDTO.getSerialNo());
                size.setSizeName(sizeDTO.getSizeName());
                size.setOrderNo(sizeDTO.getOrderNo());
                size.setArt(art);
                art.getSizes().add(size);
            }
        }
        // Map size details - NEW SECTION
        if (request.getSizeDetails() != null && !request.getSizeDetails().isEmpty()) {
            logger.info("Mapping {} size details", request.getSizeDetails().size());

            for (SizeDetailModalDTO detailDTO : request.getSizeDetails()) {
                logger.debug("Mapping size detail: Size={}, Box={}, Pcs={}, Rate={}",
                        detailDTO.getSizeName(),
                        detailDTO.getBox(),
                        detailDTO.getPcs(),
                        detailDTO.getRate());

                ArtSizeDetail detail = new ArtSizeDetail();
                detail.setSerialNo(detailDTO.getSerialNo());
                detail.setSizeName(detailDTO.getSizeName());
                detail.setOrderNo(detailDTO.getOrderNo());
                detail.setBox(detailDTO.getBox());
                detail.setPcs(detailDTO.getPcs());
                detail.setRate(detailDTO.getRate());
                detail.setArt(art);

                art.getSizeDetails().add(detail);
            }

            logger.info("Successfully mapped {} size details to art entity",
                    art.getSizeDetails().size());
        } else {
            logger.warn("No size details provided in request");
        }

        // Map accessories
        if (request.getAccessories() != null) {
            logger.info("Mapping {} accessories", request.getAccessories().size());
            for (AccessoryDTO accessoryDTO : request.getAccessories()) {
                ArtAccessory accessory = new ArtAccessory();
                accessory.setMaterialId(accessoryDTO.getMaterialId());
                accessory.setSerialNumber(accessoryDTO.getSerialNumber());
                accessory.setMaterialGroupId(accessoryDTO.getMaterialGroupId());
                accessory.setMaterialGroupName(accessoryDTO.getMaterialGroupName());
                accessory.setMaterialName(accessoryDTO.getMaterialName());
                accessory.setCode(accessoryDTO.getCode());
                accessory.setMaterialUnit(accessoryDTO.getMaterialUnit());
                accessory.setMinimumStock(accessoryDTO.getMinimumStock());
                accessory.setMaximumStock(accessoryDTO.getMaximumStock());
                accessory.setArt(art);
                art.getAccessories().add(accessory);
            }
        }

        // Map accessory details - THIS IS THE KEY PART!
        if (request.getAccessoryDetails() != null && !request.getAccessoryDetails().isEmpty()) {
            logger.info("Mapping {} accessory details", request.getAccessoryDetails().size());

            for (AccessoryDetailModalDTO detailDTO : request.getAccessoryDetails()) {
                logger.debug("Mapping accessory detail: Process={}, Accessory={}, Qty={}, Rate={}, Amount={}",
                        detailDTO.getProcessName(),
                        detailDTO.getAccessoryName(),
                        detailDTO.getQty(),
                        detailDTO.getRate(),
                        detailDTO.getAmount());

                ArtAccessoryDetail detail = new ArtAccessoryDetail();
                detail.setProcessName(detailDTO.getProcessName());
                detail.setSno(detailDTO.getSno());
                detail.setAccessoryName(detailDTO.getAccessoryName());
                detail.setQty(detailDTO.getQty());
                detail.setRate(detailDTO.getRate());
                detail.setAmount(detailDTO.getAmount());
                detail.setArt(art);  // Set the bidirectional relationship

                art.getAccessoryDetails().add(detail);
            }

            logger.info("Successfully mapped {} accessory details to art entity",
                    art.getAccessoryDetails().size());
        } else {
            logger.warn("No accessory details provided in request");
        }
    }

    private String calculateRateTotal(ArtRequestDTO request) {
        // Check if rateTotal is already provided in request
        if (request.getRateTotal() != null && !request.getRateTotal().trim().isEmpty()) {
            return request.getRateTotal();
        }

        // Calculate from processes and accessory details
        double total = 0.0;

        // Add process rates
        if (request.getProcesses() != null) {
            for (ProcessDTO process : request.getProcesses()) {
                if (process.getRate() != null && !process.getRate().trim().isEmpty()) {
                    try {
                        total += Double.parseDouble(process.getRate());
                    } catch (NumberFormatException e) {
                        logger.warn("Invalid rate format for process {}: {}",
                                process.getProcessName(), process.getRate());
                    }
                }
            }
        }

        // Add accessory detail amounts
        if (request.getAccessoryDetails() != null) {
            for (AccessoryDetailModalDTO detail : request.getAccessoryDetails()) {
                if (detail.getAmount() != null && !detail.getAmount().trim().isEmpty()) {
                    try {
                        total += Double.parseDouble(detail.getAmount());
                    } catch (NumberFormatException e) {
                        logger.warn("Invalid amount format for accessory {}: {}",
                                detail.getAccessoryName(), detail.getAmount());
                    }
                }
            }
        }

        return String.valueOf(total);
    }

    private ArtListDTO convertToListDTO(Art art) {
        ArtListDTO dto = new ArtListDTO();
        dto.setSerialNumber(art.getSerialNumber());
        dto.setArtGroup(art.getArtGroup());
        dto.setArtName(art.getArtName());
        dto.setArtNo(art.getArtNo());
        dto.setStyleName(art.getStyleName());
        dto.setSeason(art.getSeason());
        dto.setBrandName(art.getBrandName());
        dto.setSaleRate(art.getSaleRate());
        return dto;
    }

    private ArtResponseDTO convertToResponseDTO(Art art) {
        ArtResponseDTO dto = new ArtResponseDTO();
        dto.setSerialNumber(art.getSerialNumber());
        dto.setArtGroup(art.getArtGroup());
        dto.setArtName(art.getArtName());
        dto.setArtNo(art.getArtNo());
        dto.setStyleRate(art.getStyleRate());
        dto.setSaleRate(art.getSaleRate());
        dto.setStyleName(art.getStyleName());
        dto.setSeason(art.getSeason());
        dto.setCopyFromArtName(art.getCopyFromArtName());
        dto.setOpeningBalance(art.getOpeningBalance());
        dto.setWtPcs(art.getWtPcs());
        dto.setReference(art.getReference());
        dto.setBrandName(art.getBrandName());
        dto.setWorkOnArt(art.getWorkOnArt());
        dto.setRateTotal(art.getRateTotal());

        dto.setProcesses(art.getProcesses().stream()
                .map(this::convertToProcessDetailDTO)
                .collect(Collectors.toList()));

        dto.setShades(art.getShades().stream()
                .map(this::convertToShadeDetailDTO)
                .collect(Collectors.toList()));

        dto.setSizes(art.getSizes().stream()
                .map(this::convertToSizeDetailDTO)
                .collect(Collectors.toList()));

        dto.setAccessories(art.getAccessories().stream()
                .map(this::convertToAccessoryDetailDTO)
                .collect(Collectors.toList()));

        dto.setAccessoryDetails(art.getAccessoryDetails().stream()
                .map(this::convertToAccessoryDetailModalResponseDTO)
                .collect(Collectors.toList()));

        // ⚠️ ADD THIS MISSING SECTION ⚠️
        dto.setSizeDetails(art.getSizeDetails().stream()
                .map(this::convertToSizeDetailModalResponseDTO)
                .collect(Collectors.toList()));

        logger.info("Converted art to DTO - SizeDetails count: {}", dto.getSizeDetails().size());

        return dto;
    }

    private ProcessDTO convertToProcessDetailDTO(ArtProcess process) {
        ProcessDTO dto = new ProcessDTO();
        dto.setId(process.getId());
        dto.setSno(process.getSno());
        dto.setProcessName(process.getProcessName());
        dto.setRate(process.getRate());
        dto.setRate1(process.getRate1());
        dto.setSizeWid(process.getSizeWid());
        dto.setSizeWidAct(process.getSizeWidAct());
        dto.setItemRef(process.getItemRef());
        dto.setProcess(process.getProcess());
        return dto;
    }

    private ShadeDTO convertToShadeDetailDTO(ArtShade shade) {
        ShadeDTO dto = new ShadeDTO();
        dto.setId(shade.getId());
        dto.setShadeCode(shade.getShadeCode());
        dto.setShadeName(shade.getShadeName());
        dto.setColorFamily(shade.getColorFamily());
        return dto;
    }

    private SizeDTO convertToSizeDetailDTO(ArtSize size) {
        SizeDTO dto = new SizeDTO();
        dto.setId(size.getId());
        dto.setSerialNo(size.getSerialNo());
        dto.setSizeName(size.getSizeName());
        dto.setOrderNo(size.getOrderNo());
        dto.setArtGroup(size.getArtGroup());
        return dto;
    }

    private AccessoryDTO convertToAccessoryDetailDTO(ArtAccessory accessory) {
        AccessoryDTO dto = new AccessoryDTO();
        dto.setId(accessory.getId());
        dto.setMaterialId(accessory.getMaterialId());
        dto.setSerialNumber(accessory.getSerialNumber());
        dto.setMaterialGroupId(accessory.getMaterialGroupId());
        dto.setMaterialGroupName(accessory.getMaterialGroupName());
        dto.setMaterialName(accessory.getMaterialName());
        dto.setCode(accessory.getCode());
        dto.setMaterialUnit(accessory.getMaterialUnit());
        dto.setMinimumStock(accessory.getMinimumStock());
        dto.setMaximumStock(accessory.getMaximumStock());
        return dto;
    }

    private AccessoryDetailModalResponseDTO convertToAccessoryDetailModalResponseDTO(ArtAccessoryDetail detail) {
        AccessoryDetailModalResponseDTO dto = new AccessoryDetailModalResponseDTO();
        dto.setId(detail.getId());
        dto.setProcessName(detail.getProcessName());
        dto.setSno(detail.getSno());
        dto.setAccessoryName(detail.getAccessoryName());
        dto.setQty(detail.getQty());
        dto.setRate(detail.getRate());
        dto.setAmount(detail.getAmount());
        return dto;
    }
    private SizeDetailModalResponseDTO convertToSizeDetailModalResponseDTO(ArtSizeDetail detail) {
        SizeDetailModalResponseDTO dto = new SizeDetailModalResponseDTO();
        dto.setId(detail.getId());
        dto.setSerialNo(detail.getSerialNo());
        dto.setSizeName(detail.getSizeName());
        dto.setOrderNo(detail.getOrderNo());
        dto.setBox(detail.getBox());
        dto.setPcs(detail.getPcs());
        dto.setRate(detail.getRate());
        return dto;
    }
}


