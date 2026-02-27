package com.garment.repository;


import com.garment.model.FinishingOutwardRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FinishingOutwardRowRepository extends JpaRepository<FinishingOutwardRow, Long> {

    // Custom query to find all rows associated with a specific FinishingOutward's
    // ID
    List<FinishingOutwardRow> findByFinishingOutwardId(Long finishingOutwardId);
}