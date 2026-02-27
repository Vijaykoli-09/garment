package com.garment.repository;

import com.garment.model.FinishingOutward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FinishingOutwardRepository extends JpaRepository<FinishingOutward, Long> {

    // Custom query to find a FinishingOutward by its unique challanNo
    Optional<FinishingOutward> findByChallanNo(String challanNo);
}