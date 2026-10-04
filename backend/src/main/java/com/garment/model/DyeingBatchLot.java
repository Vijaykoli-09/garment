package com.garment.model;

import jakarta.persistence.*;

@Entity
@Table(
        name = "dyeing_batch_lot",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_dyeing_batch_inward_row",
                        columnNames = {"inward_id", "inward_row_id"}
                )
        }
)
public class DyeingBatchLot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id", nullable = false)
    private DyeingBatch batch;

    @Column(name = "inward_id", nullable = false)
    private Long inwardId;

    @Column(name = "inward_row_id")
    private Long inwardRowId;

    @Column(name = "lot_no", nullable = false)
    private String lotNo;

    // IMPORTANT: Fabric Name
    @Column(name = "fabric", length = 500)
    private String fabric;

    @Column(name = "rolls")
    private String rolls;

    @Column(name = "weight")
    private String weight;

    @Column(name = "received_weight")
    private String receivedWeight;

    @Column(name = "shortage")
    private String shortage;

    @Column(name = "percentage")
    private String percentage;

    @Column(name = "dyeing_rate")
    private String dyeingRate;

    @Column(name = "amount")
    private String amount;

    @Column(name = "dated")
    private String date;

    @Column(name = "challan_no")
    private String challanNo;

    @Column(name = "party_name")
    private String partyName;

    public DyeingBatchLot() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public DyeingBatch getBatch() {
        return batch;
    }

    public void setBatch(DyeingBatch batch) {
        this.batch = batch;
    }

    public Long getInwardId() {
        return inwardId;
    }

    public void setInwardId(Long inwardId) {
        this.inwardId = inwardId;
    }

    public Long getInwardRowId() {
        return inwardRowId;
    }

    public void setInwardRowId(Long inwardRowId) {
        this.inwardRowId = inwardRowId;
    }

    public String getLotNo() {
        return lotNo;
    }

    public void setLotNo(String lotNo) {
        this.lotNo = lotNo;
    }

    public String getFabric() {
        return fabric;
    }

    public void setFabric(String fabric) {
        this.fabric = fabric;
    }

    public String getRolls() {
        return rolls;
    }

    public void setRolls(String rolls) {
        this.rolls = rolls;
    }

    public String getWeight() {
        return weight;
    }

    public void setWeight(String weight) {
        this.weight = weight;
    }

    public String getReceivedWeight() {
        return receivedWeight;
    }

    public void setReceivedWeight(String receivedWeight) {
        this.receivedWeight = receivedWeight;
    }

    public String getShortage() {
        return shortage;
    }

    public void setShortage(String shortage) {
        this.shortage = shortage;
    }

    public String getPercentage() {
        return percentage;
    }

    public void setPercentage(String percentage) {
        this.percentage = percentage;
    }

    public String getDyeingRate() {
        return dyeingRate;
    }

    public void setDyeingRate(String dyeingRate) {
        this.dyeingRate = dyeingRate;
    }

    public String getAmount() {
        return amount;
    }

    public void setAmount(String amount) {
        this.amount = amount;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getChallanNo() {
        return challanNo;
    }

    public void setChallanNo(String challanNo) {
        this.challanNo = challanNo;
    }

    public String getPartyName() {
        return partyName;
    }

    public void setPartyName(String partyName) {
        this.partyName = partyName;
    }
}