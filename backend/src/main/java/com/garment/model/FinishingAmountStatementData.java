package com.garment.model;

import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "finishing_amount_statement_data")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FinishingAmountStatementData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate date;
    private String narration;
    private Double debit;
    private Double credit;
    private Double balance;
    private String type; // DIN / PAY / etc.

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "finishing_amount_statement_id")
    @JsonIgnore
    private FinishingAmountStatement finishingAmountStatement;

}
