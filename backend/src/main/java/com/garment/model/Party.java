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

    // NEW: store whether Opening Balance is Credit (CR) or Debit (DR)
    // We'll store "CR" or "DR"
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

    // New Fields
    private Integer creditDays;
    private Double creditAmount;
    private String station;

    @ManyToOne
    @JoinColumn(name = "grade_id", referencedColumnName = "serialNo")
    private CustomerGrade grade;

    // Use Transport as relation
    @ManyToOne
    @JoinColumn(name = "transports_serial_number")
    private Transport transport;

    // Lombok's @Data provides getters/setters, no need to write manually
}
