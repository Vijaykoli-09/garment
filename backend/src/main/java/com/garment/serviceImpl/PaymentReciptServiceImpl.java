// src/main/java/com/garment/serviceImpl/PaymentReciptServiceImpl.java
package com.garment.serviceImpl;

import com.garment.DTO.PaymentReciptDTO;
import com.garment.model.PaymentRecipt;
import com.garment.repository.PaymentReciptRepository;
import com.garment.service.PaymentReciptService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class PaymentReciptServiceImpl implements PaymentReciptService {

    private final PaymentReciptRepository repository;

    public PaymentReciptServiceImpl(PaymentReciptRepository repository) {
        this.repository = repository;
    }

    @Override
    public PaymentReciptDTO create(PaymentReciptDTO dto) {
        PaymentRecipt entity = new PaymentRecipt();
        updateEntityFromDto(dto, entity);
        PaymentRecipt saved = repository.save(entity);
        return toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentReciptDTO> getAll() {
        return repository.findAll()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentReciptDTO getById(Long id) {
        PaymentRecipt entity = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Receipt not found: " + id));
        return toDto(entity);
    }

    @Override
    public PaymentReciptDTO update(Long id, PaymentReciptDTO dto) {
        PaymentRecipt entity = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Receipt not found: " + id));
        updateEntityFromDto(dto, entity);
        PaymentRecipt saved = repository.save(entity);
        return toDto(saved);
    }

    @Override
    public void delete(Long id) {
        repository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getNamesByType(String type) {
        if ("Employee".equalsIgnoreCase(type)) {
            return repository.findDistinctEmployeeNamesByPaymentTo("Employee");
        } else if ("Party".equalsIgnoreCase(type)) {
            return repository.findDistinctPartyNamesByPaymentTo("Party");
        }
        return Collections.emptyList();
    }

    // ================== Mapping helpers ==================

    private PaymentReciptDTO toDto(PaymentRecipt e) {
        PaymentReciptDTO dto = new PaymentReciptDTO();
        dto.setId(e.getId());
        dto.setEntryType(e.getEntryType());
        dto.setReceiptTo(e.getPaymentTo());
        dto.setReceiptDate(e.getPaymentDate());
        dto.setDate(e.getToDate());
        dto.setProcessName(e.getProcessName());
        dto.setPartyName(e.getPartyName());
        dto.setEmployeeName(e.getEmployeeName());
        dto.setPaymentThrough(e.getPaymentThrough());
        dto.setAmount(e.getAmount());
        dto.setBalance(e.getBalance());
        dto.setRemarks(e.getRemarks());
        // agentName is not stored in entity -> dto.setAgentName(null);
        return dto;
    }

    private void updateEntityFromDto(PaymentReciptDTO dto, PaymentRecipt e) {
        e.setEntryType(dto.getEntryType());
        e.setPaymentTo(dto.getReceiptTo());
        e.setPaymentDate(dto.getReceiptDate());
        e.setToDate(dto.getDate());
        e.setProcessName(dto.getProcessName());
        e.setPartyName(dto.getPartyName());
        e.setEmployeeName(dto.getEmployeeName());
        e.setPaymentThrough(dto.getPaymentThrough());
        e.setAmount(dto.getAmount());
        e.setBalance(dto.getBalance());
        e.setRemarks(dto.getRemarks());
        // agentName is not mapped; add field + column if you want to store it
    }
}