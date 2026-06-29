package com.garment.model;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "purchase_entry")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseEntry {
	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate date;

    @ManyToOne
    @JoinColumn(name = "party_id")
    private Party party;

    private String challanNo;

    @OneToMany(mappedBy = "purchaseEntry", cascade = CascadeType.ALL, orphanRemoval = true , fetch = FetchType.EAGER)
    private List<PurchaseEntryItem> items = new ArrayList<>();

}
