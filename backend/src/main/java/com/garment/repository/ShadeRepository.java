package com.garment.repository;

import com.garment.model.Shade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ShadeRepository extends JpaRepository<Shade, String> {

    // Already used elsewhere
    boolean existsByShadeCode(String shadeCode);

    // Shade code se lookup (useful for direct code binding)
    Optional<Shade> findByShadeCode(String shadeCode);

    // Name-based lookup (case-insensitive) — Sale Order service me use ho raha
    @Query("select s from Shade s where lower(s.shadeName) = lower(:name)")
    Optional<Shade> findByShadeNameIgnoreCase(@Param("name") String name);
}