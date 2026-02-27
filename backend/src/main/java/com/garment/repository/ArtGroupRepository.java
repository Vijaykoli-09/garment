package com.garment.repository;

import com.garment.model.ArtGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ArtGroupRepository extends JpaRepository<ArtGroup, String> {
    
}
