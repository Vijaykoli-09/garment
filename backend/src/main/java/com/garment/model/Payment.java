package com.garment.model;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(name = "payment_to")
    private String paymentTo;

    @NotNull
    @Column(name = "payment_date")
    private LocalDate paymentDate;

    @NotNull
    @Column(name = "date")
    private LocalDate date;

    @Column(name = "process_name")
    private String processName;

    @Column(name = "party_name")
    private String partyName;

    @Column(name = "employee_name")
    private String employeeName;

    @NotBlank
    @Column(name = "payment_through")
    private String paymentThrough;

    @Column(name = "amount", precision = 19, scale = 2)
    @NotNull
    private BigDecimal amount;

    @Column(name = "balance", precision = 19, scale = 2)
    private BigDecimal balance;

    @Column(name = "remarks")
    private String remarks;
}