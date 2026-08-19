package com.garment.service;

import java.time.LocalDate;
import java.util.List;

import com.garment.DTO.DispatchReturnChallanDTO;
import com.garment.DTO.NextDispatchNumbersDTO;

public interface DispatchReturnChallanService {

    DispatchReturnChallanDTO create(DispatchReturnChallanDTO dto);

    DispatchReturnChallanDTO update(Long id, DispatchReturnChallanDTO dto);

    DispatchReturnChallanDTO getById(Long id);

    List<DispatchReturnChallanDTO> getAll();

    void delete(Long id);

    NextDispatchNumbersDTO getNextNumbers(LocalDate date, String partyName, String brokerName);
}