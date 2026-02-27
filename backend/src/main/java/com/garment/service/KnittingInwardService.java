package com.garment.service;

import com.garment.model.KnittingInward;
import com.garment.repository.KnittingInwardRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class KnittingInwardService {

    private final KnittingInwardRepository repo;

    public KnittingInwardService(KnittingInwardRepository repo) {
        this.repo = repo;
    }

    public KnittingInward save(KnittingInward k) {
        // ensure child rows point to parent
        if (k.getRows() != null) {
            k.getRows().forEach(r -> r.setKnittingInward(k));
        }
        return repo.save(k);
    }

    public KnittingInward update(KnittingInward k) {
        // same as save (JPA handles merge)
        if (k.getRows() != null) {
            k.getRows().forEach(r -> r.setKnittingInward(k));
        }
        return repo.save(k);
    }

    public List<KnittingInward> findAll() {
        return repo.findAll();
    }

    public Optional<KnittingInward> findById(Long id) {
        return repo.findById(id);
    }

    public void deleteById(Long id) {
        repo.deleteById(id);
    }

    public Optional<KnittingInward> findByChallanNo(String challanNo) {
        return repo.findByChallanNo(challanNo);
    }
}
