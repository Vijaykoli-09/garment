package com.garment.service;

import com.garment.DTO.SelfTransferDTO;
import java.util.List;

public interface SelfTransferService {
    List<SelfTransferDTO> getAllTransfers();
    SelfTransferDTO createTransfer(SelfTransferDTO dto);
    SelfTransferDTO updateTransfer(Long id, SelfTransferDTO dto);
    void deleteTransfer(Long id);
}
