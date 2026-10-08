package com.garment.DTO;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class DyeingBatchDTO {

    private Long id;

    private String batchName;

    private String partyName;

    private LocalDateTime createdAt;

    private List<DyeingBatchLotDTO> lots = new ArrayList<>();

    public DyeingBatchDTO() {
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

    public List<DyeingBatchLotDTO> getLots() {
        return lots;
    }

    public void setLots(List<DyeingBatchLotDTO> lots) {
        this.lots = lots;
    }
}