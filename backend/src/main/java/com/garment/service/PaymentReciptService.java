// src/main/java/com/garment/service/PaymentReciptService.java
package com.garment.service;

import com.garment.DTO.PaymentReciptDTO;
import com.garment.DTO.PaymentReciptListDTO;
import com.garment.DTO.PagedResponse;
import org.springframework.data.domain.Page;
import java.util.List;

public interface PaymentReciptService {

    PaymentReciptDTO create(PaymentReciptDTO dto);

    List<PaymentReciptDTO> getAll();
    Page<PaymentReciptListDTO> getAllPaged(int page, int size, String search);

    PaymentReciptDTO getById(Long id);

    PaymentReciptDTO update(Long id, PaymentReciptDTO dto);

    void delete(Long id);

    List<String> getNamesByType(String type);
}