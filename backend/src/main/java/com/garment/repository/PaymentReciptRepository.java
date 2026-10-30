// src/main/java/com/garment/repository/PaymentReciptRepository.java
package com.garment.repository;

import com.garment.model.PaymentRecipt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PaymentReciptRepository extends JpaRepository<PaymentRecipt, Long> {

    @Query(value = """
            select r.id as "id",
                   r.entry_type as "entryType",
                   r.payment_to as "receiptTo",
                   r.payment_date as "receiptDate",
                   r.to_date as "date",
                   r.process_name as "processName",
                   r.party_name as "partyName",
                   r.employee_name as "employeeName",
                   r.agent_name as "agentName",
                   r.amount as "amount",
                   r.discount_amount as "discountAmount",
                   r.balance as "balance"
            from recipt r
            where lower(coalesce(r.entry_type, '')) like :q
               or lower(coalesce(r.payment_to, '')) like :q
               or lower(coalesce(r.process_name, '')) like :q
               or lower(coalesce(r.agent_name, '')) like :q
               or lower(coalesce(
                    case
                        when lower(r.payment_to) = 'employee' then r.employee_name
                        when lower(r.payment_to) = 'broker' then r.agent_name
                        else r.party_name
                    end,
                    ''
               )) like :q
            order by r.id asc
            """,
            countQuery = """
            select count(*)
            from recipt r
            where lower(coalesce(r.entry_type, '')) like :q
               or lower(coalesce(r.payment_to, '')) like :q
               or lower(coalesce(r.process_name, '')) like :q
               or lower(coalesce(r.agent_name, '')) like :q
               or lower(coalesce(
                    case
                        when lower(r.payment_to) = 'employee' then r.employee_name
                        when lower(r.payment_to) = 'broker' then r.agent_name
                        else r.party_name
                    end,
                    ''
               )) like :q
            """,
            nativeQuery = true)
    Page<PaymentReciptListProjection> searchPaged(@Param("q") String query, Pageable pageable);

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

    interface PaymentReciptListProjection {
        Long getId();
        String getEntryType();
        String getReceiptTo();
        java.time.LocalDate getReceiptDate();
        java.time.LocalDate getDate();
        String getProcessName();
        String getPartyName();
        String getEmployeeName();
        String getAgentName();
        java.math.BigDecimal getAmount();
        java.math.BigDecimal getDiscountAmount();
        java.math.BigDecimal getBalance();
    }
}