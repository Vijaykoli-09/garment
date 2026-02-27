package com.garment.repository;


import com.garment.model.DyeingOutward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface DyeingOutwardRepository extends JpaRepository<DyeingOutward, Long> {
}