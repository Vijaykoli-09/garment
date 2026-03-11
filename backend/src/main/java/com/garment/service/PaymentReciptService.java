package com.garment.service;

import java.util.List;

import com.garment.DTO.PaymentReciptDTO;

public interface PaymentReciptService {
    PaymentReciptDTO create(PaymentReciptDTO dto);
    List<PaymentReciptDTO> getAll();
    PaymentReciptDTO getById(Long id);
    PaymentReciptDTO update(Long id, PaymentReciptDTO dto);
    void delete(Long id);

    List<String> getNamesByType(String type); // Party/Employee
}