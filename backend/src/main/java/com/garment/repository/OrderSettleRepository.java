// OrderSettleRepository.java
package com.garment.repository;

import com.garment.model.OrderSettle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface OrderSettleRepository extends JpaRepository<OrderSettle, Long> {

    List<OrderSettle> findByDatedBetween(LocalDate from, LocalDate to);
}