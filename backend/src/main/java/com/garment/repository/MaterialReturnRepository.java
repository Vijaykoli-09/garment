package com.garment.repository;

import com.garment.model.MaterialReturn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MaterialReturnRepository extends JpaRepository<MaterialReturn, Long> {
}
