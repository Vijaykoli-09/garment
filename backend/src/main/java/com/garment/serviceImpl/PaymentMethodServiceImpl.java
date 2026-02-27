package com.garment.serviceImpl;

import com.garment.model.Employee;
import com.garment.model.Party;
import com.garment.model.Payment;
import com.garment.repository.EmployeeRepository;
import com.garment.repository.PartyRepository;
import com.garment.repository.PaymentMethodRepository;
import com.garment.service.PaymentMethodService;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class PaymentMethodServiceImpl implements PaymentMethodService {

    private final PaymentMethodRepository paymentRepository;
    private final PartyRepository partyRepository;
    private final EmployeeRepository employeeRepository;

    @Override
    public Payment create(Payment payload) {
        normalize(payload);
        if (payload.getBalance() == null) payload.setBalance(BigDecimal.ZERO);
        return paymentRepository.save(payload);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Payment> list() {
        return paymentRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
    }

    @Override
    @Transactional(readOnly = true)
    public Payment get(Long id) {
        return paymentRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));
    }

    @Override
    public Payment update(Long id, Payment payload) {
        Payment existing = get(id);

        existing.setEntryType(payload.getEntryType());
        existing.setPaymentTo(payload.getPaymentTo());
        existing.setDate(payload.getDate());
        existing.setProcessName(payload.getProcessName());
        existing.setPartyName(payload.getPartyName());
        existing.setEmployeeName(payload.getEmployeeName());
        existing.setPaymentThrough(payload.getPaymentThrough());
        existing.setAmount(payload.getAmount());
        existing.setBalance(payload.getBalance());
        existing.setRemarks(payload.getRemarks());

        normalize(existing);
        return paymentRepository.save(existing);
    }

    @Override
    public void delete(Long id) {
        if (!paymentRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found");
        }
        paymentRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> names(String type) {
        if ("Party".equalsIgnoreCase(type)) {
            return partyRepository.findAll().stream()
                .map(Party::getPartyName)
                .filter(Objects::nonNull)
                .distinct()
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
        } else if ("Employee".equalsIgnoreCase(type)) {
            return employeeRepository.findAll().stream()
                .map(Employee::getEmployeeName)
                .filter(Objects::nonNull)
                .distinct()
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported type: " + type);
    }

    private void normalize(Payment p) {
        if ("Employee".equalsIgnoreCase(p.getPaymentTo())) {
            p.setPartyName("");
        } else if ("Party".equalsIgnoreCase(p.getPaymentTo())) {
            p.setEmployeeName("");
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "paymentTo must be Party or Employee");
        }
    }
}
