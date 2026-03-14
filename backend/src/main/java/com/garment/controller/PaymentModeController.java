package com.garment.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.garment.DTO.PaymentModeDTO;
import com.garment.service.PaymentModeService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/payment/payment-mode")
@CrossOrigin(origins = "http://localhost:3000")
public class PaymentModeController {

    private final PaymentModeService paymentModeService;

    public PaymentModeController(PaymentModeService paymentModeService) {
        this.paymentModeService = paymentModeService;
    }

    @GetMapping
    public List<PaymentModeDTO> getAllPaymentModes() {
        return paymentModeService.getAllPaymentModes();
    }

    @GetMapping("/{id}")
    public PaymentModeDTO getPaymentModeById(@PathVariable Long id) {
        return paymentModeService.getPaymentModeById(id);
    }

    @PostMapping
    public ResponseEntity<PaymentModeDTO> createPaymentMode(@Valid @RequestBody PaymentModeDTO dto) {
        PaymentModeDTO created = paymentModeService.createPaymentMode(dto);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public PaymentModeDTO updatePaymentMode(@PathVariable Long id, @Valid @RequestBody PaymentModeDTO dto) {
        return paymentModeService.updatePaymentMode(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePaymentMode(@PathVariable Long id) {
        paymentModeService.deletePaymentMode(id);
    }
}