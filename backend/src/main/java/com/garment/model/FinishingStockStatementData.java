package com.garment.model;

import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "finishing_stock_statement_data")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FinishingStockStatementData {
     @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate date;

    private String narration; // e.g. "Challan No. 758/LN F-13"

    private Double issuePcs;
    private Double issueKgs;

    private Double receiptPcs;
    private Double receiptKgs;
    private Double receiptWastage;
    private Double receiptRate;
    private Double receiptAmount;

    private Double balancePcs;
    private Double balanceKgs;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "finishing_stock_statement_id")
    @JsonIgnore
    private FinishingStockStatement finishingStockStatement;
    
}
