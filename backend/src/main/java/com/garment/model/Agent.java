package com.garment.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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

    @ElementCollection
    @CollectionTable(name = "agent_contact_numbers", joinColumns = @JoinColumn(name = "agent_serial_no"))
    @Column(name = "contact_no")
    private List<String> contactNos = new ArrayList<>();

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

    // ══════════════════════════════════════════════════════════════════
    // Broker mobile-app PIN auth. pinHash is a BCrypt hash — never the
    // raw PIN. Null pinHash means this broker hasn't set a PIN yet
    // (either brand new, or reset by admin) and should go through the
    // "set PIN" first-time flow, not "verify PIN" login.
    // ══════════════════════════════════════════════════════════════════
    private String pinHash;

    @Column(nullable = false)
    @ColumnDefault("0")
    private int failedPinAttempts = 0;

    private LocalDateTime pinLockedUntil;
}