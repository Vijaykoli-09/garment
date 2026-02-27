package com.garment.controller;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.garment.DTO.AmountReportRequestDTO;
import com.garment.DTO.AmountReportResponseDTO;
import com.garment.service.AmountReportService;

@RestController
@RequestMapping("/api/amount-report")
@CrossOrigin(origins = "http://localhost:3000")
public class AmountReportController {
	 private final AmountReportService amountReportService;

	    public AmountReportController(AmountReportService service) {
	        this.amountReportService = service;
	    }

	    @PostMapping
	    public List<AmountReportResponseDTO> getAmountReport(@RequestBody AmountReportRequestDTO request) {
	        return amountReportService.getAmountReport(request);
	    }
}
