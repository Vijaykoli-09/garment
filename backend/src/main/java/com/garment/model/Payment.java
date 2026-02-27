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
    private String entryType;        // Other | Purchase | Salary

    @NotBlank
    private String paymentTo;        // Party | Employee

    @NotNull
    private LocalDate paymentDate;

    @NotNull
    private LocalDate date;

    private String processName;

    // If paymentTo = Party, fill partyName; if Employee, fill employeeName
    private String partyName;
    private String employeeName;

    @NotBlank
    private String paymentThrough;   // UPI | Cash | Bank

    @Column(precision = 19, scale = 2)
    @NotNull
    private BigDecimal amount;

    @Column(precision = 19, scale = 2)
    private BigDecimal balance;

    private String remarks;
}
