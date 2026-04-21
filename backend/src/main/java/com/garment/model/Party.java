package com.garment.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

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
    private String mobileNo;
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