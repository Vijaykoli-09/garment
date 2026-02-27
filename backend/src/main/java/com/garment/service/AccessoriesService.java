package com.garment.service;

import com.garment.model.Accessories;
import com.garment.repository.AccessoriesRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AccessoriesService {

    private final AccessoriesRepository accessoriesRepository;

    public AccessoriesService(AccessoriesRepository accessoriesRepository) {
        this.accessoriesRepository = accessoriesRepository;
    }

    public Accessories saveAccessory(Accessories accessories) {
        return accessoriesRepository.save(accessories);
    }

    public List<Accessories> getAllAccessories() {
        return accessoriesRepository.findAll();
    }

    public Optional<Accessories> getAccessoryById(String serialNumber) {
        return accessoriesRepository.findById(serialNumber);
    }

    public Accessories updateAccessory(String serialNumber, Accessories updatedAccessory) {
        Optional<Accessories> existing = accessoriesRepository.findById(serialNumber);
        if (existing.isPresent()) {
            Accessories acc = existing.get();
            acc.setProcessName(updatedAccessory.getProcessName());
            acc.setMaterialName(updatedAccessory.getMaterialName());
            return accessoriesRepository.save(acc);
        }
        return null;
    }

    public void deleteAccessory(String serialNumber) {
        accessoriesRepository.deleteById(serialNumber);
    }
}
