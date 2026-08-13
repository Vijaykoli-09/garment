package com.garment.service;

import java.time.LocalDate;
import java.util.List;

import com.garment.DTO.ExtraHoursRequestDTO;
import com.garment.DTO.ExtraHoursResponseDTO;
import com.garment.DTO.ExtraHoursSummaryDTO;

public interface ExtraHoursService {

    ExtraHoursResponseDTO create(ExtraHoursRequestDTO request);

    ExtraHoursResponseDTO update(Long id, ExtraHoursRequestDTO request);

    void delete(Long id);

    ExtraHoursResponseDTO getById(Long id);

    List<ExtraHoursResponseDTO> list(LocalDate from, LocalDate to, String employeeCode, String processSerialNo);

    List<ExtraHoursSummaryDTO> summary(LocalDate from, LocalDate to, String employeeCode, String processSerialNo);
}