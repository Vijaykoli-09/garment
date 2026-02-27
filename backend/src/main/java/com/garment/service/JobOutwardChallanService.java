package com.garment.service;

import com.garment.DTO.JobOutwardChallanRequestDTO;
import com.garment.DTO.JobOutwardChallanResponseDTO;

import java.time.LocalDate;
import java.util.List;

public interface JobOutwardChallanService {
    String nextSerial(LocalDate date);
    JobOutwardChallanResponseDTO create(JobOutwardChallanRequestDTO dto);
    JobOutwardChallanResponseDTO update(String serialNo, JobOutwardChallanRequestDTO dto);
    JobOutwardChallanResponseDTO get(String serialNo);
    List<JobOutwardChallanResponseDTO> list();
    void delete(String serialNo);
    Object findAll();
    
}
