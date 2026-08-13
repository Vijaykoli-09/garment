package com.garment.model;

import java.time.LocalDate;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "extra_hours",
        uniqueConstraints = @UniqueConstraint(columnNames = { "employee_code", "eh_date" })
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExtraHours {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Employee primary key is code (String)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_code", referencedColumnName = "code", nullable = false)
    private Employee employee;

    @Column(name = "eh_date", nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private Double extraHours; // user enters

    @Column(nullable = false)
    private Double extraHourRate; // user enters (NOT hard-coded)

    @Column(nullable = false)
    private Double amount; // auto-calculated: extraHours * extraHourRate

    private String remarks;

    @PrePersist
    @PreUpdate
    private void calculateAmount() {
        double h = (extraHours == null) ? 0.0 : extraHours;
        double r = (extraHourRate == null) ? 0.0 : extraHourRate;
        this.amount = h * r;
    }
}