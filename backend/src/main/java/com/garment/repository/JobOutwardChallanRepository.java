package com.garment.repository;

import com.garment.model.JobOutwardChallan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface JobOutwardChallanRepository extends JpaRepository<JobOutwardChallan, String> {
    @Query("select j.serialNo from JobOutwardChallan j where j.serialNo like concat(:prefix, '%')")
    List<String> findSerialsByPrefix(String prefix);
    boolean existsBySerialNo(String serialNo);
}
