package com.garment.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;

import lombok.Data;

@Entity
@Table(name = "other_dispatch_challan")
@Data
public class OtherDispatchChallan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Internal serial, optional
    private String serialNo;

    private LocalDate date;          // "YYYY-MM-DD" from frontend

    // Auto-generate: YYYY/0001
    private String challanNo;

    private String partyName;
    private String brokerName;
    private String transportName;
    private String dispatchedBy;
    private String remarks1;
    private String remarks2;
    private String station;

    private BigDecimal totalAmt;
    private BigDecimal discount;
    private BigDecimal discountPercent;
    private BigDecimal tax;
    private BigDecimal taxPercent;
    private BigDecimal cartage;
    private BigDecimal netAmt;

    @OneToMany(mappedBy = "challan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OtherDispatchRow> rows = new ArrayList<>();
}