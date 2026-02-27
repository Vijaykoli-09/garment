package com.garment.repository;

import com.garment.model.KnittingMaterialReturn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface KnittingMaterialReturnRepository extends JpaRepository<KnittingMaterialReturn, Long> {}
