package com.garment.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "dyeing_batch",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_dyeing_batch_party_name",
                        columnNames = {"party_name", "batch_name"}
                )
        }
)
public class DyeingBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_name", nullable = false)
    private String batchName;

    @Column(name = "party_name", nullable = false)
    private String partyName;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @OneToMany(
            mappedBy = "batch",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private List<DyeingBatchLot> lots = new ArrayList<>();

    public DyeingBatch() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getBatchName() {
        return batchName;
    }

    public void setBatchName(String batchName) {
        this.batchName = batchName;
    }

    public String getPartyName() {
        return partyName;
    }

    public void setPartyName(String partyName) {
        this.partyName = partyName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public List<DyeingBatchLot> getLots() {
        return lots;
    }

    public void setLots(List<DyeingBatchLot> lots) {
        this.lots = lots;
    }

    public void addLot(DyeingBatchLot lot) {
        lots.add(lot);
        lot.setBatch(this);
    }

    public void removeLot(DyeingBatchLot lot) {
        lots.remove(lot);
        lot.setBatch(null);
    }
}