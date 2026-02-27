package com.garment.repository;

import com.garment.model.KnittingMaterialReturnRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface KnittingMaterialReturnRowRepository extends JpaRepository<KnittingMaterialReturnRow, Long> {}
