package com.garment.model;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "purchase_entries")
@Data
@NoArgsConstructor
public class MaterialPurchaseEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "challan_no")
    private String challanNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "party_id", nullable = false)
    private Party party;

    @OneToMany(
            mappedBy = "purchaseEntry",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private List<MaterialPurchaseEntryItem> items = new ArrayList<>();

    // Helper Method
    public void addItem(MaterialPurchaseEntryItem item) {
        item.setPurchaseEntry(this);
        items.add(item);
    }

    // Helper Method
    public void removeItem(MaterialPurchaseEntryItem item) {
        item.setPurchaseEntry(null);
        items.remove(item);
    }

    // Clear all items
    public void clearItems() {
        for (MaterialPurchaseEntryItem item : items) {
            item.setPurchaseEntry(null);
        }
        items.clear();
    }
}