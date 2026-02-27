package com.garment.service;

import com.garment.model.Shade;
import com.garment.repository.ShadeRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ShadeService {

    private final ShadeRepository shadeRepository;

    public ShadeService(ShadeRepository shadeRepository) {
        this.shadeRepository = shadeRepository;
    }

    public List<Shade> getAllShades() {
        return shadeRepository.findAll();
    }

    public Shade saveShade(Shade shade) {
        if (shadeRepository.existsById(shade.getShadeCode())) {
            throw new RuntimeException("Shade Code already exists: " + shade.getShadeCode());
        }
        return shadeRepository.save(shade);
    }

    public Shade updateShade(String shadeCode, Shade updatedShade) {
        Shade existing = shadeRepository.findById(shadeCode)
                .orElseThrow(() -> new RuntimeException("Shade not found: " + shadeCode));

        existing.setShadeName(updatedShade.getShadeName());
        return shadeRepository.save(existing);
    }

    public void deleteShade(String shadeCode) {
        if (!shadeRepository.existsById(shadeCode)) {
            throw new RuntimeException("Shade not found: " + shadeCode);
        }
        shadeRepository.deleteById(shadeCode);
    }

    public Optional<Shade> getShadeByCode(String shadeCode) {
        return shadeRepository.findById(shadeCode);
    }
}
