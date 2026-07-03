package com.garment.model;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "material_purchase_order",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_mpo_order_no", columnNames = {"order_no"}),
        @UniqueConstraint(name = "uk_mpo_year_seq", columnNames = {"order_year", "order_seq"})
    }
)
public class MaterialPurchaseOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Example: "2025/1001"
    @Column(name = "order_no", nullable = false, length = 20)
    private String orderNo;

    @Column(name = "order_year", nullable = false)
    private Integer orderYear;

    @Column(name = "order_seq", nullable = false)
    private Integer orderSeq;

    @Column(name = "order_date")
    private LocalDate date;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "party_id")
    private Party party;

    @OneToMany(
        mappedBy = "purchaseOrder",
        cascade = CascadeType.ALL,
        orphanRemoval = true
    )
    private List<MaterialPurchaseOrderItem> items = new ArrayList<>();

    // ----- helpers -----
    public void addItem(MaterialPurchaseOrderItem item) {
        items.add(item);
        item.setPurchaseOrder(this);
    }

    public void clearItems() {
        for (MaterialPurchaseOrderItem i : items) {
            i.setPurchaseOrder(null);
        }
        items.clear();
    }

    // ----- getters/setters -----
    public Long getId() { return id; }

    public String getOrderNo() { return orderNo; }
    public void setOrderNo(String orderNo) { this.orderNo = orderNo; }

    public Integer getOrderYear() { return orderYear; }
    public void setOrderYear(Integer orderYear) { this.orderYear = orderYear; }

    public Integer getOrderSeq() { return orderSeq; }
    public void setOrderSeq(Integer orderSeq) { this.orderSeq = orderSeq; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public Party getParty() { return party; }
    public void setParty(Party party) { this.party = party; }

    public List<MaterialPurchaseOrderItem> getItems() { return items; }
    public void setItems(List<MaterialPurchaseOrderItem> items) { this.items = items; }
}