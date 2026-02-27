package com.garment.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "dispatch_challan")
@Data
public class DispatchChallan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String serialNo;

    private LocalDate date;          // "YYYY-MM-DD" from frontend

    private String challanNo;
    private String partyName;
    private String brokerName;
    private String transportName;
    private String dispatchedBy;
    private String remarks1;
    private String remarks2;

    private BigDecimal totalAmt;
    private BigDecimal discount;
    private BigDecimal discountPercent;
    private BigDecimal tax;
    private BigDecimal taxPercent;
    private BigDecimal cartage;
    private BigDecimal netAmt;

    @OneToMany(mappedBy = "challan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DispatchRow> rows = new ArrayList<>();

    @OneToMany(mappedBy = "challan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DispatchPackingRow> packingRows = new ArrayList<>();
}