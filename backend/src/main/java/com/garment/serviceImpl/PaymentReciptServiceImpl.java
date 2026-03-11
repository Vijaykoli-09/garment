package com.garment.serviceImpl;

import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.garment.DTO.PaymentReciptDTO;
import com.garment.model.PaymentRecipt;
import com.garment.repository.PaymentReciptRepository;
import com.garment.service.PaymentReciptService;

@Service
public class PaymentReciptServiceImpl implements PaymentReciptService {

    private final PaymentReciptRepository repo;

    public PaymentReciptServiceImpl(PaymentReciptRepository repo) {
        this.repo = repo;
    }

    @Override
    public PaymentReciptDTO create(PaymentReciptDTO dto) {
        PaymentRecipt entity = new PaymentRecipt();
        applyDtoToEntity(dto, entity);
        PaymentRecipt saved = repo.save(entity);
        return toDto(saved);
    }

    @Override
    public List<PaymentReciptDTO> getAll() {
        return repo.findAll()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public PaymentReciptDTO getById(Long id) {
        PaymentRecipt entity = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "PaymentRecipt not found: " + id
                ));
        return toDto(entity);
    }

    @Override
    public PaymentReciptDTO update(Long id, PaymentReciptDTO dto) {
        PaymentRecipt entity = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "PaymentRecipt not found: " + id
                ));

        applyDtoToEntity(dto, entity);
        PaymentRecipt updated = repo.save(entity);
        return toDto(updated);
    }

    @Override
    public void delete(Long id) {
        PaymentRecipt entity = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "PaymentRecipt not found: " + id
                ));
        repo.delete(entity);
    }

    /**
     * Repository is SIMPLE (JpaRepository only), so we compute distinct names from findAll().
     * type expected values: "Party" / "Employee"
     */
    @Override
    public List<String> getNamesByType(String type) {
        if (type == null || type.trim().isEmpty()) return List.of();

        String t = type.trim().toLowerCase(Locale.ROOT);

        return repo.findAll()
                .stream()
                .filter(r -> r.getPaymentTo() != null)
                .filter(r -> r.getPaymentTo().trim().toLowerCase(Locale.ROOT).equals(t))
                .flatMap(r -> {
                    if ("party".equals(t)) {
                        return Stream.of(r.getPartyName());
                    }
                    if ("employee".equals(t)) {
                        return Stream.of(r.getEmployeeName());
                    }
                    return Stream.empty();
                })
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .collect(Collectors.toList());
    }

    // ---------- mapping helpers ----------
    private PaymentReciptDTO toDto(PaymentRecipt p) {
        PaymentReciptDTO dto = new PaymentReciptDTO();
        dto.setId(p.getId());
        dto.setEntryType(p.getEntryType());
        dto.setPaymentTo(p.getPaymentTo());
        dto.setPaymentDate(p.getPaymentDate());
        dto.setDate(p.getToDate());
        dto.setProcessName(p.getProcessName());
        dto.setPartyName(p.getPartyName());
        dto.setEmployeeName(p.getEmployeeName());
        dto.setPaymentThrough(p.getPaymentThrough());
        dto.setAmount(p.getAmount());
        dto.setBalance(p.getBalance());
        dto.setRemarks(p.getRemarks());
        return dto;
    }

    private void applyDtoToEntity(PaymentReciptDTO dto, PaymentRecipt entity) {
        entity.setEntryType(dto.getEntryType());
        entity.setPaymentTo(dto.getPaymentTo());
        entity.setPaymentDate(dto.getPaymentDate());
        entity.setToDate(dto.getDate());
        entity.setProcessName(dto.getProcessName());
        entity.setPartyName(dto.getPartyName());
        entity.setEmployeeName(dto.getEmployeeName());
        entity.setPaymentThrough(dto.getPaymentThrough());
        entity.setAmount(dto.getAmount());
        entity.setBalance(dto.getBalance());
        entity.setRemarks(dto.getRemarks());
    }
}