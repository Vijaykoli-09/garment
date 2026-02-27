package com.garment.repository;


import com.garment.model.DyeingOutwardRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface DyeingOutwardRowRepository extends JpaRepository<DyeingOutwardRow, Long> {
}