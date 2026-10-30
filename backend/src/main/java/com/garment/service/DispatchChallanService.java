package com.garment.service;

import java.time.LocalDate;
import java.util.List;

import com.garment.DTO.DispatchChallanDTO;
import com.garment.DTO.DispatchChallanListDTO;
import com.garment.DTO.NextDispatchNumbersDTO;
import com.garment.DTO.PagedResponse;

public interface DispatchChallanService {

    DispatchChallanDTO create(DispatchChallanDTO dto);

    DispatchChallanDTO update(Long id, DispatchChallanDTO dto);

    DispatchChallanDTO getById(Long id);

    List<DispatchChallanDTO> getAll();

    PagedResponse<DispatchChallanListDTO> getAllPaged(int page, int size, String search);

    void delete(Long id);

    // NEW: Party + Date ke basis par next Serial/Challan no.
    NextDispatchNumbersDTO getNextNumbers(LocalDate date, String partyName, String brokerName);
}