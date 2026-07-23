package com.garment.repository;

import com.garment.model.Agent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AgentRepository extends JpaRepository<Agent, String> {

    // Used by the mobile "Broker Login" flow to look an agent up by phone.
    // findFirst (not find) on purpose: contactNo has no unique constraint yet,
    // so this won't blow up with IncorrectResultSizeDataAccessException if two
    // agents share a number. Worth adding a unique index on contactNo later
    // once you're sure the data is clean.
    Optional<Agent> findFirstByContactNo(String contactNo);
}