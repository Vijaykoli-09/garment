// src/main/java/com/garment/serviceImpl/LedgerBillStatusServiceImpl.java
package com.garment.serviceImpl;

import com.garment.DTO.LedgerBillStatusDTO;
import com.garment.model.LedgerBillStatus;
import com.garment.repository.LedgerBillStatusRepository;
import com.garment.service.LedgerBillStatusService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class LedgerBillStatusServiceImpl implements LedgerBillStatusService {

    private final LedgerBillStatusRepository repository;

    public LedgerBillStatusServiceImpl(LedgerBillStatusRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public LedgerBillStatusDTO getByDocKey(String docKey) {
        LedgerBillStatus s = repository.findByDocKey(docKey)
                .orElseGet(() -> {
                    LedgerBillStatus x = new LedgerBillStatus();
                    x.setDocKey(docKey);
                    x.setManualPaidUser(false);
                    return x;
                });
        return toDto(s);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LedgerBillStatusDTO> bulkGetByDocKeys(List<String> docKeys) {
        if (docKeys == null || docKeys.isEmpty()) return Collections.emptyList();
        return repository.findByDocKeyIn(docKeys)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public LedgerBillStatusDTO upsertManualPaidUser(String docKey, boolean manualPaidUser) {
        if (docKey == null || docKey.trim().isEmpty()) {
            throw new IllegalArgumentException("docKey is required");
        }

        LedgerBillStatus s = repository.findByDocKey(docKey)
                .orElseGet(() -> new LedgerBillStatus(docKey, false));

        s.setManualPaidUser(manualPaidUser);
        LedgerBillStatus saved = repository.save(s);
        return toDto(saved);
    }

    private LedgerBillStatusDTO toDto(LedgerBillStatus s) {
        return new LedgerBillStatusDTO(
                s.getDocKey(),
                s.isManualPaidUser(),
                s.getUpdatedAt()
        );
    }
}