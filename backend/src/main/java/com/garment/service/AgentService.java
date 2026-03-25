package com.garment.service;

import com.garment.model.Agent;
import com.garment.repository.AgentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

@Service
public class AgentService {

    private final AgentRepository repository;

    public AgentService(AgentRepository repository) {
        this.repository = repository;
    }

    public Agent save(Agent agent) {
        // defaults (optional safety)
        if (agent.getOpeningBalance() == null) agent.setOpeningBalance(BigDecimal.ZERO);
        if (agent.getOpeningBalanceType() == null || agent.getOpeningBalanceType().isBlank())
            agent.setOpeningBalanceType("DR");

        return repository.save(agent);
    }

    public Agent update(String serialNo, Agent updatedAgent) {
        return repository.findById(serialNo)
                .map(agent -> {
                    agent.setAgentName(updatedAgent.getAgentName());
                    agent.setContactNo(updatedAgent.getContactNo());
                    agent.setEmail(updatedAgent.getEmail());
                    agent.setAddress(updatedAgent.getAddress());
                    agent.setCity(updatedAgent.getCity());
                    agent.setState(updatedAgent.getState());
                    agent.setZipCode(updatedAgent.getZipCode());

                    agent.setOpeningBalance(updatedAgent.getOpeningBalance() == null ? BigDecimal.ZERO : updatedAgent.getOpeningBalance());
                    agent.setOpeningBalanceType(
                            (updatedAgent.getOpeningBalanceType() == null || updatedAgent.getOpeningBalanceType().isBlank())
                                    ? "DR"
                                    : updatedAgent.getOpeningBalanceType()
                    );

                    return repository.save(agent);
                })
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND,
                                "Agent not found with serialNo: " + serialNo));
    }

    public List<Agent> getAll() {
        return repository.findAll();
    }

    public Agent getBySerialNo(String serialNo) {
        return repository.findById(serialNo)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND,
                                "Agent not found with serialNo: " + serialNo));
    }

    public void delete(String serialNo) {
        if (!repository.existsById(serialNo)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Agent not found with serialNo: " + serialNo);
        }
        repository.deleteById(serialNo);
    }
}