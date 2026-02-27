package com.garment.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.garment.model.Payment;

public interface PaymentMethodRepository extends JpaRepository<Payment, Long> {

    
}
