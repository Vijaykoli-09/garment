package com.garment.DTO;

public class DyeingBatchLotDTO {

    private Long id;

    private Long inwardId;

    private Long inwardRowId;

    private String uniqueKey;

    private String lotNo;

    // IMPORTANT: Fabric Name
    private String fabric;

    private String rolls;
    private String weight;
    private String receivedWeight;
    private String shortage;
    private String percentage;
    private String dyeingRate;
    private String amount;
    private String date;
    private String challanNo;
    private String partyName;

    public DyeingBatchLotDTO() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public String getUniqueKey() {
        return uniqueKey;
    }

    public void setUniqueKey(String uniqueKey) {
        this.uniqueKey = uniqueKey;
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