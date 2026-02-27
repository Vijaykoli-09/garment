package com.garment.model;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "finishing_stock_statement")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FinishingStockStatement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "party_name")
    private String partyName;

    @Column(name = "item_name")
    private String itemName;
    
    @Column(name = "from_dated")
    private LocalDate fromDate;
    
    @Column(name = "to_dated")
    private LocalDate toDated;

    @OneToMany(mappedBy = "finishingStockStatement", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FinishingStockStatementData> rows = new ArrayList<>();

    public void addRow(FinishingStockStatementData row) {
        rows.add(row);
        row.setFinishingStockStatement(this);
    }

    public void removeRow(FinishingStockStatementData row) {
        rows.remove(row);
        row.setFinishingStockStatement(null);
    }

}

