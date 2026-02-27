package com.garment.repository;

import com.garment.model.JobInwardChallan;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JobInwardChallanRepository extends JpaRepository<JobInwardChallan, Long> {
    boolean existsByChallanNo(String challanNo);
}
