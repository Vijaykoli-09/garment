package com.garment.service;

import com.garment.model.ArtGroup;
import com.garment.repository.ArtGroupRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ArtGroupService {

    private final ArtGroupRepository repository;

    public ArtGroupService(ArtGroupRepository repository) {
        this.repository = repository;
    }

    public List<ArtGroup> listAll() {
        return repository.findAll();
    }

    public ArtGroup save(ArtGroup artGroup) {
        return repository.save(artGroup);
    }

    public Optional<ArtGroup> findById(String serialNo) {
        return repository.findById(serialNo);
    }

    public void deleteById(String serialNo) {
        repository.deleteById(serialNo);
    }
}
