package com.garment.service;

import java.util.List;

import com.garment.DTO.AmountReportRequestDTO;
import com.garment.DTO.AmountReportResponseDTO;




public interface AmountReportService {
	List<AmountReportResponseDTO> getAmountReport(AmountReportRequestDTO request);
}
