package com.garment.service;

import com.garment.DTO.PagedResponse;
import com.garment.DTO.PaymentListDTO;
import com.garment.model.Payment;
import java.util.List;

public interface PaymentMethodService {
    Payment create(Payment payload);
    List<Payment> list();
    PagedResponse<PaymentListDTO> listPaged(int page, int size, String search);
    Payment get(Long id);
    Payment update(Long id, Payment payload);
    void delete(Long id);
    List<String> names(String type); // "Party" or "Employee"
}
