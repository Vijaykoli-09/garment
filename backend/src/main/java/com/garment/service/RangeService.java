package com.garment.service;


//import com.garment.dto.RangeDTO;
import com.garment.model.Range;
import com.garment.repository.RangeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.garment.DTO.RangeDTO;
//import com.garment.dto.RangeRequestDTO;


import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class RangeService {

    @Autowired
    private RangeRepository rangeRepository;

    // Convert entity to DTO
    private RangeDTO toDTO(Range range) {
        return new RangeDTO(
                range.getSerialNumber(),
                range.getRangeName(),
                range.getStartValue(),
                range.getEndValue()
                
        );
    }

    // Convert DTO to entity
    private Range toEntity(RangeDTO dto) {
        return new Range(
                dto.getSerialNumber(),
                dto.getRangeName(),
                dto.getStartValue(),
                dto.getEndValue()
                
        );
    }

    public List<RangeDTO> getAllRanges() {
        return rangeRepository.findAll().stream().map(this::toDTO).collect(Collectors.toList());
    }

    public RangeDTO saveRange(RangeDTO dto) {
        Range range = toEntity(dto);
        return toDTO(rangeRepository.save(range));
    }

    public RangeDTO updateRange(String serialNumber, RangeDTO dto) {
        Optional<Range> optionalRange = rangeRepository.findById(serialNumber);
        if (optionalRange.isPresent()) {
            Range range = optionalRange.get();
            range.setRangeName(dto.getRangeName());
            
            range.setStartValue(dto.getStartValue());
            range.setEndValue(dto.getEndValue());
            
            return toDTO(rangeRepository.save(range));
        }
        return null;
    }

    public boolean deleteRange(String serialNumber) {
        if (rangeRepository.existsById(serialNumber)) {
            rangeRepository.deleteById(serialNumber);
            return true;
        }
        return false;
    }
}
