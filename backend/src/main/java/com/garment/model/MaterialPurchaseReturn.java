package com.garment.model;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(name = "material_purchase_return")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = "items")
public class MaterialPurchaseReturn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate date;

    private String challanNo;

    @ManyToOne
    @JoinColumn(name = "party_id")
    private Party party; // ✅ added (frontend sends partyId and list shows partyName)

    @OneToMany(
            mappedBy = "materialPurchaseReturn",
            cascade = CascadeType.ALL,
            orphanRemoval = true)
    private List<MaterialPurchaseReturnItem> items = new ArrayList<>();
}