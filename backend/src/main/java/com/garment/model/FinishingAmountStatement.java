package com.garment.model;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "finishing-amount_statement")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FinishingAmountStatement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "party_name")
    private String partyName;

    @Column(name = "from_date")
    private LocalDate fromDate;

    @Column(name = "to_date")
    private LocalDate toDate;

    @OneToMany(mappedBy = "finishingAmountStatement", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FinishingAmountStatementData> rows = new ArrayList<>();
   
    public void addRow(FinishingAmountStatementData row) {
        rows.add(row);
        row.setFinishingAmountStatement(this);
    }

    public void removeRow(FinishingAmountStatementData row) {
        rows.remove(row);
        row.setFinishingAmountStatement(null);
    }
}
