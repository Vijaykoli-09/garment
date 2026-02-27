package com.garment.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "production_receipt")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProductionReceipt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String voucherNo;

    // stored as ISO date string in frontend -> use LocalDate
    private LocalDate dated;

    private String employeeName;
    private String processName;
    private Boolean randomEntry = false;

    @OneToMany(mappedBy = "receipt", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ProductionReceiptRow> rows = new ArrayList<>();

    @Column(name = "deleted", nullable = false)
    private Boolean deleted = false;

//    private Boolean deleted = false;

    public void addRow(ProductionReceiptRow row) {
        row.setReceipt(this);
        this.rows.add(row);
    }

    public void clearRows() {
        this.rows.forEach(r -> r.setReceipt(null));
        this.rows.clear();
    }
}
