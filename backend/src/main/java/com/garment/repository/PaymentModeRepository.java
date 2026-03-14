package com.garment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.garment.model.PaymentMode;

@Repository
public interface PaymentModeRepository extends JpaRepository<PaymentMode, Long> {
}