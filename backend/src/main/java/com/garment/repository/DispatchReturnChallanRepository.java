package com.garment.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.garment.model.DispatchReturnChallan;

public interface DispatchReturnChallanRepository extends JpaRepository<DispatchReturnChallan, Long> {

    @Query("select coalesce(max(c.challanSeq), 0) from DispatchReturnChallan c where c.challanYear = :year")
    int findMaxChallanSeqByYear(@Param("year") int year);

    @Query("""
        select coalesce(max(c.serialSeq), 0)
        from DispatchReturnChallan c
        where c.serialYear = :year
          and c.partyName = :partyName
          and c.brokerName = :brokerName
    """)
    int findMaxSerialSeq(@Param("year") int year,
                         @Param("partyName") String partyName,
                         @Param("brokerName") String brokerName);

    List<DispatchReturnChallan> findByDateBetween(LocalDate start, LocalDate end);
}