package com.garment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.garment.model.PaymentRecipt;

@Repository
public interface PaymentReciptRepository extends JpaRepository<PaymentRecipt, Long> {
   
}