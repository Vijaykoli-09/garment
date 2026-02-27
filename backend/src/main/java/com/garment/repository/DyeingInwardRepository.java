package com.garment.repository;

import com.garment.model.DyeingInward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DyeingInwardRepository extends JpaRepository<DyeingInward, Long> {
    List<DyeingInward> findAllByOrderByIdDesc();
}