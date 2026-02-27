package com.garment.repository;

import com.garment.model.MaterialReturnRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MaterialReturnRowRepository extends JpaRepository<MaterialReturnRow, Long> {
}
