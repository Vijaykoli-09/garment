package com.garment.repository;

import com.garment.model.Party;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PartyRepository extends JpaRepository<Party, Long> {
    Party findByPartyName(String partyName);

    List<Party> findByAgent_SerialNo(String serialNo);

    List<Party> findByAgent_AgentName(String agentName);

    List<Party> findByCategory_CategoryName(String categoryName);

    Party findByGstNo(String gstNo);

    // Used by the Broker Dashboard's party list + search bar.
    // Matches against name, mobile, and GST no — case-insensitive.
    @Query("SELECT p FROM Party p WHERE p.agent.serialNo = :serialNo AND (" +
           "LOWER(p.partyName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "p.mobileNo LIKE CONCAT('%', :search, '%') OR " +
           "LOWER(p.gstNo) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<Party> searchByAgentSerialNo(@Param("serialNo") String serialNo, @Param("search") String search);
}