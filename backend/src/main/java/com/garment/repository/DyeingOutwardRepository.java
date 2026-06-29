package com.garment.repository;

import com.garment.model.DyeingOutward;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DyeingOutwardRepository extends JpaRepository<DyeingOutward, Long> {

    @Override
    @EntityGraph(attributePaths = {"rows"})
    List<DyeingOutward> findAll();

    @Override
    @EntityGraph(attributePaths = {"rows"})
    Optional<DyeingOutward> findById(Long id);
}