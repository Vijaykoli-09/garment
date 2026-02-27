package com.garment.repository;

import com.garment.model.ArtShade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ArtShadeRepository extends JpaRepository<ArtShade, Long> {
}