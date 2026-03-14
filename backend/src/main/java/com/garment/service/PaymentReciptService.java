// src/main/java/com/garment/service/PaymentReciptService.java
package com.garment.service;

import com.garment.DTO.PaymentReciptDTO;

import java.util.List;

public interface PaymentReciptService {

    PaymentReciptDTO create(PaymentReciptDTO dto);

    List<PaymentReciptDTO> getAll();

    PaymentReciptDTO getById(Long id);

    PaymentReciptDTO update(Long id, PaymentReciptDTO dto);

    void delete(Long id);

    List<String> getNamesByType(String type);
}