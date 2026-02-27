package com.garment.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "sale_orders", indexes = {
        @Index(name = "idx_so_order_no", columnList = "order_no", unique = true),
        @Index(name = "idx_so_dated", columnList = "dated")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaleOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="order_no", nullable = false, unique = true, length = 32)
    private String orderNo;             // e.g. O/2025-0001

    @Column(name="dated")
    private LocalDate dated;

    @Column(name="delivery_date")
    private LocalDate deliveryDate;

    @Column(name="party_id")
    private Long partyId;               // optional (if provided)

    @Column(name="party_name", length=200)
    private String partyName;

    @Column(name="remarks", length=500)
    private String remarks;

    @Column(name="total_peti")
    private Integer totalPeti;

    @Column(name="total_pcs")
    private Integer totalPcs;

    @Column(name="created_at")
    private LocalDateTime createdAt;
    @Column(name="updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "saleOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sno asc")
    private List<SaleOrderRow> rows = new ArrayList<>();

    @PrePersist
    void onCreate(){ createdAt = updatedAt = LocalDateTime.now(); }
    @PreUpdate
    void onUpdate(){ updatedAt = LocalDateTime.now(); }

    public void addRow(SaleOrderRow r){
        rows.add(r);
        r.setSaleOrder(this);
    }
}