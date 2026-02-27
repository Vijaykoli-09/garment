package com.garment.model;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import jakarta.persistence.*;

@Entity
@Table(name = "material_return")
public class MaterialReturn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String docType;
    private String challanNo;
    private LocalDate dated;
    private String partyName;
    private Long partyId;
    private Long inwardId;
    private String vehicleNo;
    private String through;
    private String narration;

    private Integer totalRolls;
    private Double totalWeight;
    private Double totalWastage;

    @OneToMany(mappedBy = "materialReturn", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MaterialReturnRow> rows = new ArrayList<>();

    // Getters and setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDocType() { return docType; }
    public void setDocType(String docType) { this.docType = docType; }

    public String getChallanNo() { return challanNo; }
    public void setChallanNo(String challanNo) { this.challanNo = challanNo; }

    public LocalDate getDated() { return dated; }
    public void setDated(LocalDate dated) { this.dated = dated; }

    public String getPartyName() { return partyName; }
    public void setPartyName(String partyName) { this.partyName = partyName; }

    public Long getPartyId() { return partyId; }
    public void setPartyId(Long partyId) { this.partyId = partyId; }

    public Long getInwardId() { return inwardId; }
    public void setInwardId(Long inwardId) { this.inwardId = inwardId; }

    public String getVehicleNo() { return vehicleNo; }
    public void setVehicleNo(String vehicleNo) { this.vehicleNo = vehicleNo; }

    public String getThrough() { return through; }
    public void setThrough(String through) { this.through = through; }

    public String getNarration() { return narration; }
    public void setNarration(String narration) { this.narration = narration; }

    public Integer getTotalRolls() { return totalRolls; }
    public void setTotalRolls(Integer totalRolls) { this.totalRolls = totalRolls; }

    public Double getTotalWeight() { return totalWeight; }
    public void setTotalWeight(Double totalWeight) { this.totalWeight = totalWeight; }

    public Double getTotalWastage() { return totalWastage; }
    public void setTotalWastage(Double totalWastage) { this.totalWastage = totalWastage; }

    public List<MaterialReturnRow> getRows() { return rows; }
    public void setRows(List<MaterialReturnRow> rows) {
        this.rows.clear();
        if (rows != null) {
            rows.forEach(this::addRow);
        }
    }

    public void addRow(MaterialReturnRow row) {
        row.setMaterialReturn(this);
        this.rows.add(row);
    }

    public void removeRow(MaterialReturnRow row) {
        row.setMaterialReturn(null);
        this.rows.remove(row);
    }
}
