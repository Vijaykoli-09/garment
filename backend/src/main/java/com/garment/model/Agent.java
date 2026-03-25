package com.garment.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "agents")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Agent {

    @Id
    @Column(unique = true, nullable = false)
    private String serialNo;  // Primary Key

    @Column(nullable = false)
    private String agentName;

    private String contactNo;
    private String email;
    private String address;
    private String city;
    private String state;
    private String zipCode;

    @Column(precision = 15, scale = 2)
    private BigDecimal openingBalance;

    // "CR" or "DR"
    @Column(length = 2)
    private String openingBalanceType;
}