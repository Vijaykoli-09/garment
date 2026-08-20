package com.garment.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "dispatch_return_challan")
@Data
public class DispatchReturnChallan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "serial_no", nullable = false)
    private String serialNo;

    @Column(name = "serial_seq", nullable = false)
    private Integer serialSeq;

    @Column(name = "serial_year", nullable = false)
    private Integer serialYear;

    @Column(name = "date", nullable = false)
    private LocalDate date;

    @Column(name = "challan_no", nullable = false)
    private String challanNo;

    @Column(name = "challan_seq", nullable = false)
    private Integer challanSeq;

    @Column(name = "challan_year", nullable = false)
    private Integer challanYear;

    @Column(name = "party_name", nullable = false)
    private String partyName;

    @Column(name = "broker_name")
    private String brokerName;

    @Column(name = "station")
    private String station;

    @Column(name = "transport_name")
    private String transportName;

    @Column(name = "dispatched_by")
    private String dispatchedBy;

    @Column(name = "remarks1")
    private String remarks1;

    @Column(name = "remarks2")
    private String remarks2;

    @Column(name = "total_amt")
    private BigDecimal totalAmt;

    @Column(name = "discount")
    private BigDecimal discount;

    @Column(name = "discount_percent")
    private BigDecimal discountPercent;

    @Column(name = "tax")
    private BigDecimal tax;

    @Column(name = "tax_percent")
    private BigDecimal taxPercent;

    @Column(name = "cartage")
    private BigDecimal cartage;

    @Column(name = "net_amt")
    private BigDecimal netAmt;

    @OneToMany(mappedBy = "challan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DispatchReturnRow> rows = new ArrayList<>();

    @OneToMany(mappedBy = "challan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DispatchReturnPackingRow> packingRows = new ArrayList<>();
}