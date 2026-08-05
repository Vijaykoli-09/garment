// src/main/java/com/garment/repository/PaymentReciptRepository.java
package com.garment.repository;

import com.garment.model.PaymentRecipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PaymentReciptRepository extends JpaRepository<PaymentRecipt, Long> {

    @Query("""
        select distinct r.employeeName
        from PaymentRecipt r
        where lower(r.paymentTo) = lower(:paymentTo)
          and r.employeeName is not null
          and trim(r.employeeName) <> ''
        order by r.employeeName
    """)
    List<String> findDistinctEmployeeNamesByPaymentTo(@Param("paymentTo") String paymentTo);

    @Query("""
        select distinct r.partyName
        from PaymentRecipt r
        where lower(r.paymentTo) = lower(:paymentTo)
          and r.partyName is not null
          and trim(r.partyName) <> ''
        order by r.partyName
    """)
    List<String> findDistinctPartyNamesByPaymentTo(@Param("paymentTo") String paymentTo);

    @Query("""
        select distinct r.agentName
        from PaymentRecipt r
        where lower(r.paymentTo) = lower(:paymentTo)
          and r.agentName is not null
          and trim(r.agentName) <> ''
        order by r.agentName
    """)
    List<String> findDistinctAgentNamesByPaymentTo(@Param("paymentTo") String paymentTo);
}