package com.garment.service;

import com.garment.model.Yarn;
import com.garment.repository.YarnRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class YarnService {
    private final YarnRepository yarnRepository;

    public YarnService(YarnRepository yarnRepository) {
        this.yarnRepository = yarnRepository;
    }

    public List<Yarn> findAll() {
        return yarnRepository.findAll();
    }

    public Optional<Yarn> findById(String serialNo) {
        return yarnRepository.findById(serialNo);
    }

    public Yarn save(Yarn yarn) {
        return yarnRepository.save(yarn);
    }

    public Yarn update(String serialNo, Yarn updated) {
        // without custom exception handling: if entity not found, we'll either create new or return null
        return yarnRepository.findById(serialNo).map(existing -> {
            existing.setYarnName(updated.getYarnName());
            existing.setUnit(updated.getUnit());
            existing.setRate(updated.getRate());
            return yarnRepository.save(existing);
        }).orElseGet(() -> {
            // If not found, set serialNo and save as new
            updated.setSerialNo(serialNo);
            return yarnRepository.save(updated);
        });
    }

    public void deleteById(String serialNo) {
        yarnRepository.deleteById(serialNo);
    }

    public boolean existsById(String serialNo) {
        return yarnRepository.existsById(serialNo);
    }
}
