package com.garment.repository;

import com.garment.model.ArtAccessory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ArtAccessoryRepository extends JpaRepository<ArtAccessory, Long> {
}