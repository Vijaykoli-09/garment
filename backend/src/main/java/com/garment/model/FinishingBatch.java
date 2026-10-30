package com.garment.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "finishing_batch",
        uniqueConstraints = @UniqueConstraint(name = "uk_finishing_batch_party_name", columnNames = {"party_name", "batch_name"}))
public class FinishingBatch {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_name", nullable = false)
    private String batchName;

    @Column(name = "party_name", nullable = false)
    private String partyName;

    @Column(name = "batch_date")
    private LocalDate batchDate;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "batch", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FinishingBatchLot> lots = new ArrayList<>();

    public FinishingBatch() {}
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getBatchName() { return batchName; }
    public void setBatchName(String batchName) { this.batchName = batchName; }
    public String getPartyName() { return partyName; }
    public void setPartyName(String partyName) { this.partyName = partyName; }
    public LocalDate getBatchDate() { return batchDate; }
    public void setBatchDate(LocalDate batchDate) { this.batchDate = batchDate; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public List<FinishingBatchLot> getLots() { return lots; }
    public void setLots(List<FinishingBatchLot> lots) { this.lots = lots; }
    public void addLot(FinishingBatchLot lot) { lots.add(lot); lot.setBatch(this); }
    public void clearLots() { for (FinishingBatchLot lot : lots) lot.setBatch(null); lots.clear(); }
}
