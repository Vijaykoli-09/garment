package com.garment.model;


import jakarta.persistence.*;

@Entity
@Table(name = "material_return_row")
public class MaterialReturnRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String lotNo;
    private String item;
    private String shade;
    private String processing;
    private Integer rolls;
    private Double weight;
    private Double wastage;
    private String remarks;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_return_id")
    private MaterialReturn materialReturn;

    // Getters and setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getLotNo() { return lotNo; }
    public void setLotNo(String lotNo) { this.lotNo = lotNo; }

    public String getItem() { return item; }
    public void setItem(String item) { this.item = item; }

    public String getShade() { return shade; }
    public void setShade(String shade) { this.shade = shade; }

    public String getProcessing() { return processing; }
    public void setProcessing(String processing) { this.processing = processing; }

    public Integer getRolls() { return rolls; }
    public void setRolls(Integer rolls) { this.rolls = rolls; }

    public Double getWeight() { return weight; }
    public void setWeight(Double weight) { this.weight = weight; }

    public Double getWastage() { return wastage; }
    public void setWastage(Double wastage) { this.wastage = wastage; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public MaterialReturn getMaterialReturn() { return materialReturn; }
    public void setMaterialReturn(MaterialReturn materialReturn) { this.materialReturn = materialReturn; }
}
