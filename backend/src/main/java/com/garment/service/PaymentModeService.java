package com.garment.service;

import java.util.List;

import com.garment.DTO.PaymentModeDTO;

public interface PaymentModeService {

    List<PaymentModeDTO> getAllPaymentModes();

    PaymentModeDTO getPaymentModeById(Long id);

    PaymentModeDTO createPaymentMode(PaymentModeDTO dto);

    PaymentModeDTO updatePaymentMode(Long id, PaymentModeDTO dto);

    void deletePaymentMode(Long id);
}