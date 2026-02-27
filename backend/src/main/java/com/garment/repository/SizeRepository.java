package com.garment.repository;

import com.garment.model.Size;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SizeRepository extends JpaRepository<Size, Long> {

    @Query("SELECT s FROM Size s " +
            "WHERE (:serialNo IS NULL OR s.serialNo LIKE %:serialNo%) " +
            "AND (:sizeName IS NULL OR s.sizeName LIKE %:sizeName%) " +
            "AND (:artGroup IS NULL OR s.artGroup.artGroupName LIKE %:artGroup%)")
    List<Size> findByFilters(
            @Param("serialNo") String serialNo,
            @Param("sizeName") String sizeName,
            @Param("artGroup") String artGroup);

    // Name-based lookup (case-insensitive) — Sale Order me Size linking ke liye
    @Query("select s from Size s where lower(s.sizeName) = lower(:name)")
    Optional<Size> findBySizeNameIgnoreCase(@Param("name") String name);
}