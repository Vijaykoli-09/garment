package com.garment.service;

import com.garment.model.Party;
import com.garment.repository.PartyRepository;
import com.garment.repository.TransportRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class PartyService {
    private final PartyRepository repository;
    private final TransportRepository transportRepository;

    public PartyService(PartyRepository repository,
                        TransportRepository transportRepository) {
        this.repository = repository;
        this.transportRepository = transportRepository;
    }

    public Party saveParty(Party party) {
        return repository.save(party);
    }

    public List<Party> getAllParties() {
        return repository.findAll();
    }

    public List<Party> getPartiesByCategory(String categoryName) {
        return repository.findByCategory_CategoryName(categoryName);
    }

    public Optional<Party> getPartyById(Long id) {
        return repository.findById(id);
    }

    public Party updateParty(Party party) {
        return repository.save(party);
    }

    public void deleteParty(Long id) {
        repository.deleteById(id);
    }

    public Party getPartyByName(String partyName) {
        return repository.findByPartyName(partyName);
    }

    public List<Party> getPartiesByAgentName(String agentName) {
        return repository.findByAgent_AgentName(agentName);
    }

    public List<Party> getPartiesByAgentSerial(String serialNo) {
        return repository.findByAgent_SerialNo(serialNo);
    }
}