package com.garment.service;

import com.garment.model.SaleOrderReturn;
import com.garment.model.SaleOrderReturnRow;
import com.garment.repository.SaleOrderReturnRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class SaleOrderReturnService {

    @Autowired
    private SaleOrderReturnRepository repository;

    public List<SaleOrderReturn> getAllReturns() {
        return repository.findAll();
    }

    public Optional<SaleOrderReturn> getReturnById(Long id) {
        return repository.findById(id);
    }

    @Transactional
    public SaleOrderReturn createReturn(SaleOrderReturn saleOrderReturn) {
        if (saleOrderReturn.getReturnNo() == null || saleOrderReturn.getReturnNo().isEmpty()) {
            saleOrderReturn.setReturnNo(generateNextReturnNo());
        }
        return repository.save(saleOrderReturn);
    }

    @Transactional
    public SaleOrderReturn updateReturn(Long id, SaleOrderReturn updatedReturn) {
        SaleOrderReturn existing = repository.findById(id).orElse(null);
        if (existing != null) {
            existing.setReturnNo(updatedReturn.getReturnNo());
            existing.setDate(updatedReturn.getDate());
            existing.setPartyName(updatedReturn.getPartyName());
            existing.setBrokerName(updatedReturn.getBrokerName());
            existing.setTransportName(updatedReturn.getTransportName());
            existing.setReceivedBy(updatedReturn.getReceivedBy());
            existing.setRemarks1(updatedReturn.getRemarks1());
            existing.setRemarks2(updatedReturn.getRemarks2());
            existing.setTotalAmt(updatedReturn.getTotalAmt());
            existing.setDiscount(updatedReturn.getDiscount());
            existing.setDiscountPercent(updatedReturn.getDiscountPercent());
            existing.setTax(updatedReturn.getTax());
            existing.setTaxPercent(updatedReturn.getTaxPercent());
            existing.setCartage(updatedReturn.getCartage());
            existing.setNetAmt(updatedReturn.getNetAmt());
            existing.setRows(updatedReturn.getRows());
            return repository.save(existing);
        }
        return null;
    }

    @Transactional
    public void deleteReturn(Long id) {
        repository.deleteById(id);
    }

    public String generateNextReturnNo() {
        Integer nextSerial = repository.getNextSerialNumber();
        if (nextSerial == null) {
            nextSerial = 1;
        }
        return String.format("SOR-%04d", nextSerial);
    }
}