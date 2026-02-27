package com.garment.model;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "material_stock")
@Data
public class MaterialStock {
	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "material_id")
    private Material material;

    @ManyToOne
    @JoinColumn(name = "shade_id", nullable = true)
    private Shade shade;

    private Double openingStock = 0.0;
    private Double purchase = 0.0;   // from PurchaseEntry
    private Double consumed = 0.0;   // from KnittingOutward
    private Double balance = 0.0;    // calculated = opening + purchase - consumed
    
    @Column(name = "transaction_date")
    private LocalDate transactionDate; // ✅ New field
}
