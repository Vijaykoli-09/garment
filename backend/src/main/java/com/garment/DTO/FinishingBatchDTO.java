package com.garment.DTO;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class FinishingBatchDTO {
    private Long id;
    private String batchName;
    private String partyName;
    private LocalDate batchDate;
    private LocalDateTime createdAt;
    private List<FinishingBatchLotDTO> lots = new ArrayList<>();

    public FinishingBatchDTO() {}
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
    public List<FinishingBatchLotDTO> getLots() { return lots; }
    public void setLots(List<FinishingBatchLotDTO> lots) { this.lots = lots; }
}
