// src/main/java/com/garment/repository/PaymentReciptRepository.java
package com.garment.repository;

import com.garment.model.PaymentRecipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PaymentReciptRepository extends JpaRepository<PaymentRecipt, Long> {

    @Query("""
           select distinct p.partyName
           from PaymentRecipt p
           where p.paymentTo = :type
             and p.partyName is not null
             and p.partyName <> ''
           """)
    List<String> findDistinctPartyNamesByPaymentTo(@Param("type") String type);

    @Query("""
           select distinct p.employeeName
           from PaymentRecipt p
           where p.paymentTo = :type
             and p.employeeName is not null
             and p.employeeName <> ''
           """)
    List<String> findDistinctEmployeeNamesByPaymentTo(@Param("type") String type);
}