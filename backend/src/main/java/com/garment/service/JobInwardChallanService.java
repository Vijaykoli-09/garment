package com.garment.service;

import com.garment.DTO.JobInwardChallanRequest;
import com.garment.DTO.JobInwardChallanResponse;

import java.util.List;

public interface JobInwardChallanService {
    List<JobInwardChallanResponse> findAll();
    JobInwardChallanResponse findById(Long id);
    JobInwardChallanResponse save(JobInwardChallanRequest req);
    JobInwardChallanResponse update(Long id, JobInwardChallanRequest req);
    void delete(Long id);
}
