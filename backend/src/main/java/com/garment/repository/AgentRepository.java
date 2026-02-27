package com.garment.repository;

import com.garment.model.Agent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentRepository extends JpaRepository<Agent, String> {
    // No need for custom methods since serialNo is @Id
}
