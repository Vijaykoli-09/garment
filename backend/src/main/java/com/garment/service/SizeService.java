package com.garment.service;

import com.garment.model.Size;
import com.garment.repository.SizeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class SizeService {

    @Autowired
    private SizeRepository sizeRepository;

    // Save new size
    public Size saveSize(Size size) {
        return sizeRepository.save(size);
    }

    // Get size by ID
    public Optional<Size> getSizeById(Long id) {
        return sizeRepository.findById(id);
    }

    // Update existing size
    public Size updateSize(Long id, Size size) {
        Size existing = sizeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Size not found"));
        existing.setSerialNo(size.getSerialNo());
        existing.setSizeName(size.getSizeName());

        //🧑‍🏫 Setter now expects an ArtGroup object

        existing.setArtGroup(size.getArtGroup());
        // existing.setArtName(size.getArtName());
        // existing.setSizeGroup(size.getSizeGroup());
        return sizeRepository.save(existing);
    }

    // Delete size
    public void deleteSize(Long id) {
        sizeRepository.deleteById(id);
    }

    // Search sizes with optional filters

    public List<Size> searchSizes(String serialNo, String sizeName, String artGroup, String artName) {
        return sizeRepository.findByFilters(
                serialNo != null && !serialNo.isEmpty() ? serialNo : null,
                sizeName != null && !sizeName.isEmpty() ? sizeName : null,
                artGroup != null && !artGroup.isEmpty() ? artGroup : null);


    }
}


