package com.garment.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.garment.model.SaleOrder;

public interface SaleOrderRepository extends JpaRepository<SaleOrder, Long> {
    Optional<SaleOrder> findByOrderNo(String orderNo);

    @Query("select s.orderNo from SaleOrder s where s.orderNo like concat(:prefix, '%')")
    List<String> findOrderNosByPrefix(String prefix);

    // For pendency
    List<SaleOrder> findByDatedBefore(LocalDate fromDate);
    List<SaleOrder> findByDatedBetween(LocalDate fromDate, LocalDate toDate);
}