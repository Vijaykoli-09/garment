package com.garment.controller;

import com.garment.DTO.ArtListDTO;
import com.garment.DTO.ArtRequestDTO;
import com.garment.DTO.ArtResponseDTO;
import com.garment.service.ArtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/arts")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class ArtController {

    private final ArtService artService;

    @GetMapping
    public ResponseEntity<List<ArtListDTO>> getAllArts() {
        List<ArtListDTO> arts = artService.getAllArts();
        return ResponseEntity.ok(arts);
    }

    // ✅ NEW: Dropdown endpoint for art selection
    @GetMapping("/dropdown")
    public ResponseEntity<List<Map<String, String>>> getArtsDropdown() {
        List<ArtListDTO> arts = artService.getAllArts();
        List<Map<String, String>> dropdown = arts.stream()
                .map(art -> Map.of(
                    "serialNumber", art.getSerialNumber() != null ? art.getSerialNumber() : "",
                    "artNo", art.getArtNo() != null ? art.getArtNo() : "",
                    "artName", art.getArtName() != null ? art.getArtName() : "",
                    "saleRate", art.getSaleRate() != null ? art.getSaleRate() : ""
                ))
                .collect(Collectors.toList());
        return ResponseEntity.ok(dropdown);
    }

    @GetMapping("/{serialNumber}")
    public ResponseEntity<ArtResponseDTO> getArtBySerialNumber(@PathVariable String serialNumber) {
        ArtResponseDTO art = artService.getArtBySerialNumber(serialNumber);
        if (art == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(art);
    }

    @PostMapping
    public ResponseEntity<ArtResponseDTO> createArt(@RequestBody ArtRequestDTO requestDTO) {
        ArtResponseDTO createdArt = artService.createArt(requestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdArt);
    }

    @PutMapping("/{serialNumber}")
    public ResponseEntity<ArtResponseDTO> updateArt(
            @PathVariable String serialNumber,
            @RequestBody ArtRequestDTO requestDTO) {
        ArtResponseDTO updatedArt = artService.updateArt(serialNumber, requestDTO);
        if (updatedArt == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(updatedArt);
    }

    @DeleteMapping("/{serialNumber}")
    public ResponseEntity<Void> deleteArt(@PathVariable String serialNumber) {
        artService.deleteArt(serialNumber);
        return ResponseEntity.noContent().build();
    }
}