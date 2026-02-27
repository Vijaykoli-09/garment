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