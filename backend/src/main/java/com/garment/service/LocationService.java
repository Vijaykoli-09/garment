package com.garment.service;

import com.garment.DTO.LocationDTO;

import java.util.List;

public interface LocationService {
    List<LocationDTO> findAll(String search);
    LocationDTO getById(Long id);
    LocationDTO create(LocationDTO dto);
    LocationDTO update(Long id, LocationDTO dto);
    void delete(Long id);
    String getNextSerial();
}