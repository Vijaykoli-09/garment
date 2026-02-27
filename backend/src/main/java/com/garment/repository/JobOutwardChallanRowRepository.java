package com.garment.repository;

import java.util.List;


import org.springframework.data.jpa.repository.JpaRepository;

import com.garment.model.JobOutwardChallanRow;

public interface JobOutwardChallanRowRepository extends JpaRepository<JobOutwardChallanRow, Long> {
    List<JobOutwardChallanRow> findByCutLotNoOrderBySnoAsc(String cutLotNo);
}
