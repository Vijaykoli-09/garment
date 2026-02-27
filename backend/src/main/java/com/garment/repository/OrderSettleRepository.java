package com.garment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.garment.model.OrderSettle;

public interface OrderSettleRepository extends JpaRepository<OrderSettle, Long> {
}