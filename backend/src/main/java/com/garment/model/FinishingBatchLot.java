package com.garment.model;

import jakarta.persistence.*;

@Entity
@Table(name = "finishing_batch_lot")
public class FinishingBatchLot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id", nullable = false)
    private FinishingBatch batch;

    @Column(name = "inward_id", nullable = false)
    private Long inwardId;

    @Column(name = "inward_row_id")
    private Long inwardRowId;

    @Column(name = "unique_key", length = 300)
    private String uniqueKey;

    @Column(name = "lot_no", nullable = false)
    private String lotNo;

    @Column(name = "item_name", length = 500)
    private String itemName;
    private String shade;
    private String processing;
    private String rolls;
    private String weight;

    @Column(name = "received_weight")
    private String receivedWeight;
    private String wastage;

    @Column(name = "extra_wt")
    private String extraWt;
    private String percentage;

    @Column(name = "rate_fnd")
    private String rateFND;
    private String rate;
    private String amount;

    @Column(name = "inward_date")
    private String date;

    @Column(name = "challan_no")
    private String challanNo;

    @Column(name = "party_name")
    private String partyName;

    public FinishingBatchLot() {}
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public FinishingBatch getBatch() { return batch; }
    public void setBatch(FinishingBatch batch) { this.batch = batch; }
    public Long getInwardId() { return inwardId; }
    public void setInwardId(Long inwardId) { this.inwardId = inwardId; }
    public Long getInwardRowId() { return inwardRowId; }
    public void setInwardRowId(Long inwardRowId) { this.inwardRowId = inwardRowId; }
    public String getUniqueKey() { return uniqueKey; }
    public void setUniqueKey(String uniqueKey) { this.uniqueKey = uniqueKey; }
    public String getLotNo() { return lotNo; }
    public void setLotNo(String lotNo) { this.lotNo = lotNo; }
    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }
    public String getShade() { return shade; }
    public void setShade(String shade) { this.shade = shade; }
    public String getProcessing() { return processing; }
    public void setProcessing(String processing) { this.processing = processing; }
    public String getRolls() { return rolls; }
    public void setRolls(String rolls) { this.rolls = rolls; }
    public String getWeight() { return weight; }
    public void setWeight(String weight) { this.weight = weight; }
    public String getReceivedWeight() { return receivedWeight; }
    public void setReceivedWeight(String receivedWeight) { this.receivedWeight = receivedWeight; }
    public String getWastage() { return wastage; }
    public void setWastage(String wastage) { this.wastage = wastage; }
    public String getExtraWt() { return extraWt; }
    public void setExtraWt(String extraWt) { this.extraWt = extraWt; }
    public String getPercentage() { return percentage; }
    public void setPercentage(String percentage) { this.percentage = percentage; }
    public String getRateFND() { return rateFND; }
    public void setRateFND(String rateFND) { this.rateFND = rateFND; }
    public String getRate() { return rate; }
    public void setRate(String rate) { this.rate = rate; }
    public String getAmount() { return amount; }
    public void setAmount(String amount) { this.amount = amount; }
    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
    public String getChallanNo() { return challanNo; }
    public void setChallanNo(String challanNo) { this.challanNo = challanNo; }
    public String getPartyName() { return partyName; }
    public void setPartyName(String partyName) { this.partyName = partyName; }
}
