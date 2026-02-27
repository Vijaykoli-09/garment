package com.garment.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@Table(name = "knitting_inward")
public class KnittingInward {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "challan_no", unique = true, nullable = false)
    private String challanNo;

    private LocalDate dated;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "party_id")
    private Party party;

    private Integer totalRolls;
    private Double totalWeight;
    private Double totalAmount;

    @OneToMany(mappedBy = "knittingInward", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<KnittingRow> rows = new ArrayList<>();
}
