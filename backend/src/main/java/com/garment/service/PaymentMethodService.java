package com.garment.service;

import com.garment.model.Payment;
import java.util.List;

public interface PaymentMethodService {
    Payment create(Payment payload);
    List<Payment> list();
    Payment get(Long id);
    Payment update(Long id, Payment payload);
    void delete(Long id);
    List<String> names(String type); // "Party" or "Employee"
}
