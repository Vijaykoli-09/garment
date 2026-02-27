package com.garment.repository;

import com.garment.model.Art;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ArtRepository extends JpaRepository<Art, String> {
    Optional<Art> findBySerialNumber(String serialNumber);
    boolean existsBySerialNumber(String serialNumber);
    Optional<Art> findFirstByArtNo(String artNo);
}