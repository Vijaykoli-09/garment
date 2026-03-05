package com.garment.repository;

import com.garment.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    // Only active products (used by mobile app)
    List<Product> findByActiveTrueOrderByCreatedAtDesc();

    // Search by name (case-insensitive) — active only
    List<Product> findByActiveTrueAndNameContainingIgnoreCaseOrderByCreatedAtDesc(String name);

    // Admin: all products including inactive
    List<Product> findAllByOrderByCreatedAtDesc();
}