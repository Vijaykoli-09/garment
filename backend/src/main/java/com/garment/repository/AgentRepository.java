package com.garment.repository;

import com.garment.model.Agent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface AgentRepository extends JpaRepository<Agent, String> {

    // Finds an agent using any one of their contact numbers.
    @Query("SELECT DISTINCT a FROM Agent a JOIN a.contactNos c WHERE c = :contactNo")
    Optional<Agent> findFirstByContactNo(@Param("contactNo") String contactNo);
}
