package com.garment.serviceImpl;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.garment.DTO.PaymentModeDTO;
import com.garment.model.PaymentMode;
import com.garment.repository.PaymentModeRepository;
import com.garment.service.PaymentModeService;

@Service
public class PaymentModeServiceImpl implements PaymentModeService {

    private final PaymentModeRepository paymentModeRepository;

    public PaymentModeServiceImpl(PaymentModeRepository paymentModeRepository) {
        this.paymentModeRepository = paymentModeRepository;
    }

    @Override
    public List<PaymentModeDTO> getAllPaymentModes() {
        return paymentModeRepository.findAll()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public PaymentModeDTO getPaymentModeById(Long id) {
        PaymentMode entity = paymentModeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Payment mode not found with id: " + id
                ));
        return toDto(entity);
    }

    @Override
    public PaymentModeDTO createPaymentMode(PaymentModeDTO dto) {
        PaymentMode entity = new PaymentMode();
        entity.setBankNameOrUpiId(dto.getBankNameOrUpiId());
        entity.setAccountNo(dto.getAccountNo());

        entity.setOpeningBalance(dto.getOpeningBalance() == null ? 0.0 : dto.getOpeningBalance());
        entity.setOpeningBalanceType(dto.getOpeningBalanceType() == null
                ? PaymentMode.OpeningBalanceType.CR
                : dto.getOpeningBalanceType());

        PaymentMode saved = paymentModeRepository.save(entity);
        return toDto(saved);
    }

    @Override
    public PaymentModeDTO updatePaymentMode(Long id, PaymentModeDTO dto) {
        PaymentMode existing = paymentModeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Payment mode not found with id: " + id
                ));

        existing.setBankNameOrUpiId(dto.getBankNameOrUpiId());
        existing.setAccountNo(dto.getAccountNo());
        existing.setOpeningBalance(dto.getOpeningBalance() == null ? 0.0 : dto.getOpeningBalance());
        existing.setOpeningBalanceType(dto.getOpeningBalanceType() == null
                ? PaymentMode.OpeningBalanceType.CR
                : dto.getOpeningBalanceType());

        PaymentMode updated = paymentModeRepository.save(existing);
        return toDto(updated);
    }

    @Override
    public void deletePaymentMode(Long id) {
        PaymentMode existing = paymentModeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Payment mode not found with id: " + id
                ));
        paymentModeRepository.delete(existing);
    }

    private PaymentModeDTO toDto(PaymentMode entity) {
        PaymentModeDTO dto = new PaymentModeDTO();
        dto.setId(entity.getId());
        dto.setBankNameOrUpiId(entity.getBankNameOrUpiId());
        dto.setAccountNo(entity.getAccountNo());
        dto.setOpeningBalance(entity.getOpeningBalance());
        dto.setOpeningBalanceType(entity.getOpeningBalanceType());

        return dto;
    }
}