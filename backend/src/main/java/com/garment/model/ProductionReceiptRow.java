package com.garment.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "production_receipt_row")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProductionReceiptRow {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String cardNo;      // cutting lot no
    private String artNo;
    private String size;        // Size (note: frontend field name is 'Size' — we map that in DTO)
    private String pcs;
    private String originalPcs;
    private String weightage;
    private String rate;
    private String amount;
    private String remarks;

    // link back to parent
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receipt_id")
    private ProductionReceipt receipt;
}
