package com.garment.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.garment.model.Payment;

public interface PaymentMethodRepository extends JpaRepository<Payment, Long> {

    @Query(value = """
            select p.id as "id",
                   p.payment_date as "paymentDate",
                   p.payment_to as "paymentTo",
                   p.party_name as "partyName",
                   p.employee_name as "employeeName",
                   p.process_name as "processName",
                   p.amount as "amount"
            from payments p
            where lower(coalesce(p.payment_to, '')) like :q
               or lower(coalesce(p.process_name, '')) like :q
               or lower(coalesce(p.payment_through, '')) like :q
               or lower(coalesce(
                    case when lower(p.payment_to) = 'employee' then p.employee_name else p.party_name end,
                    ''
               )) like :q
            order by p.id desc
            """,
            countQuery = """
            select count(*)
            from payments p
            where lower(coalesce(p.payment_to, '')) like :q
               or lower(coalesce(p.process_name, '')) like :q
               or lower(coalesce(p.payment_through, '')) like :q
               or lower(coalesce(
                    case when lower(p.payment_to) = 'employee' then p.employee_name else p.party_name end,
                    ''
               )) like :q
            """,
            nativeQuery = true)
    Page<PaymentListProjection> searchPaged(@Param("q") String query, Pageable pageable);

    interface PaymentListProjection {
        Long getId();
        java.time.LocalDate getPaymentDate();
        String getPaymentTo();
        String getPartyName();
        String getEmployeeName();
        String getProcessName();
        java.math.BigDecimal getAmount();
    }
}
