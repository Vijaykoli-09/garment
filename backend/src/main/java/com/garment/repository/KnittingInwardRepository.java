package com.garment.repository;

import com.garment.model.KnittingInward;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface KnittingInwardRepository extends JpaRepository<KnittingInward, Long> {
    Optional<KnittingInward> findByChallanNo(String challanNo);
}
