package com.garment.repository;

import com.garment.model.Party;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PartyRepository extends JpaRepository<Party, Long> {
    Party findByPartyName(String partyName);

    List<Party> findByAgent_SerialNo(String serialNo);

    List<Party> findByAgent_AgentName(String agentName);

    List<Party> findByCategory_CategoryName(String categoryName);
}
