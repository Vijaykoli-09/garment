package com.garment.serviceImpl;

import com.garment.DTO.SelfTransferDTO;
import com.garment.model.SelfTransfer;
import com.garment.repository.SelfTransferRepository;
import com.garment.service.SelfTransferService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class SelfTransferServiceImpl implements SelfTransferService {
    private final SelfTransferRepository repository;
    public SelfTransferServiceImpl(SelfTransferRepository repository) { this.repository = repository; }

    @Override @Transactional(readOnly = true)
    public List<SelfTransferDTO> getAllTransfers() {
        return repository.findAll().stream().map(this::toDTO).collect(Collectors.toList());
    }
    @Override @Transactional
    public SelfTransferDTO createTransfer(SelfTransferDTO dto) {
        validate(dto);
        SelfTransfer entity = new SelfTransfer();
        apply(entity, dto);
        return toDTO(repository.save(entity));
    }
    @Override @Transactional
    public SelfTransferDTO updateTransfer(Long id, SelfTransferDTO dto) {
        SelfTransfer entity = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Transfer not found: " + id));
        validate(dto);
        apply(entity, dto);
        return toDTO(repository.save(entity));
    }
    @Override @Transactional
    public void deleteTransfer(Long id) {
        if (!repository.existsById(id)) throw new IllegalArgumentException("Transfer not found: " + id);
        repository.deleteById(id);
    }
    private void validate(SelfTransferDTO dto) {
        if (dto == null) throw new IllegalArgumentException("Transfer data is required");
        if (dto.getAmount() == null || dto.getAmount().compareTo(BigDecimal.ZERO) <= 0)
            throw new IllegalArgumentException("Amount must be greater than zero");
        String from = normalizeType(dto.getFromAccountType());
        String to = normalizeType(dto.getToAccountType());
        dto.setFromAccountType(from); dto.setToAccountType(to);
        validateAccount(from, dto.getFromPaymentModeId(), "From");
        validateAccount(to, dto.getToPaymentModeId(), "To");
        if (from.equals(to) && ("CASH".equals(from) || dto.getFromPaymentModeId().equals(dto.getToPaymentModeId())))
            throw new IllegalArgumentException("From and To accounts must be different");
        if (dto.getTransferDate() == null) dto.setTransferDate(LocalDate.now());
    }
    private String normalizeType(String value) {
        String type = value == null || value.trim().isEmpty() ? "BANK" : value.trim().toUpperCase(Locale.ROOT);
        if (!type.equals("BANK") && !type.equals("PAYMENT_MODE") && !type.equals("CASH"))
            throw new IllegalArgumentException("Account type must be BANK or CASH");
        return type.equals("PAYMENT_MODE") ? "BANK" : type;
    }
    private void validateAccount(String type, Long id, String label) {
        if ("BANK".equals(type) && (id == null || id <= 0))
            throw new IllegalArgumentException(label + " bank account is required");
        if ("CASH".equals(type) && id != null)
            throw new IllegalArgumentException(label + " cash account must not have a payment mode ID");
    }
    private void apply(SelfTransfer entity, SelfTransferDTO dto) {
        entity.setTransferDate(dto.getTransferDate());
        entity.setFromPaymentModeId(dto.getFromPaymentModeId());
        entity.setToPaymentModeId(dto.getToPaymentModeId());
        entity.setFromAccountType(dto.getFromAccountType()); entity.setToAccountType(dto.getToAccountType());
        entity.setFromAccountName(dto.getFromAccountName()); entity.setToAccountName(dto.getToAccountName());
        entity.setAmount(dto.getAmount()); entity.setReferenceNo(dto.getReferenceNo()); entity.setNarration(dto.getNarration());
    }
    private SelfTransferDTO toDTO(SelfTransfer e) {
        SelfTransferDTO d = new SelfTransferDTO();
        d.setId(e.getId()); d.setTransferDate(e.getTransferDate());
        d.setFromPaymentModeId(e.getFromPaymentModeId()); d.setToPaymentModeId(e.getToPaymentModeId());
        d.setFromAccountType(e.getFromAccountType()); d.setToAccountType(e.getToAccountType());
        d.setFromAccountName(e.getFromAccountName()); d.setToAccountName(e.getToAccountName());
        d.setAmount(e.getAmount()); d.setReferenceNo(e.getReferenceNo()); d.setNarration(e.getNarration());
        return d;
    }
}
