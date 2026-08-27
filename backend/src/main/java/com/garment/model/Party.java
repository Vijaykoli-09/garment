package com.garment.model;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "party")
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class Party {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String serialNumber;

    private String partyName;
    private String address;

    // Supports one or multiple mobile numbers for a party
    @ElementCollection
    @CollectionTable(name = "party_mobile_numbers", joinColumns = @JoinColumn(name = "party_id"))
    @Column(name = "mobile_no")
    private List<String> mobileNos = new ArrayList<>();

    private String gstNo;
    private Double openingBalance;

    private String openingBalanceType;

    private Double openingTaxBalance;
    private LocalDate date;

    @ManyToOne
    @JoinColumn(name = "category_id", referencedColumnName = "serialNo")
    private Category category;

    private String stateName;
    private String stateCode;

    @ManyToOne
    @JoinColumn(name = "agent_serial_no", referencedColumnName = "serialNo")
    private Agent agent;

    private Integer creditDays;
    private Double creditAmount;
    private String station;

    @ManyToOne
    @JoinColumn(name = "grade_id", referencedColumnName = "serialNo")
    private CustomerGrade grade;

    @ManyToOne
    @JoinColumn(name = "transports_serial_number")
    private Transport transport;

    // Optional Party Type (null allowed)
    @Enumerated(EnumType.STRING)
    @Column(name = "customer_type")
    private CustomerType customerType;
}