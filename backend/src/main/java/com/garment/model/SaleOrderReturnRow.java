package com.garment.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "sale_order_return_rows")
public class SaleOrderReturnRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_order_return_id")
    @JsonIgnore
    private SaleOrderReturn saleOrderReturn;

    private Long dispatchChallanId;
    private String dispatchChallanNo;
    private String barCode;
    private String artNo;
    private String description;
    private String lotNumber;
    private String size;
    private String shade;

    private Double box = 0.0;
    private Double pcsPerBox = 0.0;
    private Double pcs = 0.0;
    private Double originalPcs = 0.0;
    private Double rate = 0.0;
    private Double amt = 0.0;
    private Double returnQty = 0.0;
    private String reason;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public SaleOrderReturn getSaleOrderReturn() { return saleOrderReturn; }
    public void setSaleOrderReturn(SaleOrderReturn saleOrderReturn) { this.saleOrderReturn = saleOrderReturn; }

    public Long getDispatchChallanId() { return dispatchChallanId; }
    public void setDispatchChallanId(Long dispatchChallanId) { this.dispatchChallanId = dispatchChallanId; }

    public String getDispatchChallanNo() { return dispatchChallanNo; }
    public void setDispatchChallanNo(String dispatchChallanNo) { this.dispatchChallanNo = dispatchChallanNo; }

    public String getBarCode() { return barCode; }
    public void setBarCode(String barCode) { this.barCode = barCode; }

    public String getArtNo() { return artNo; }
    public void setArtNo(String artNo) { this.artNo = artNo; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getLotNumber() { return lotNumber; }
    public void setLotNumber(String lotNumber) { this.lotNumber = lotNumber; }

    public String getSize() { return size; }
    public void setSize(String size) { this.size = size; }

    public String getShade() { return shade; }
    public void setShade(String shade) { this.shade = shade; }

    public Double getBox() { return box; }
    public void setBox(Double box) { this.box = box; }

    public Double getPcsPerBox() { return pcsPerBox; }
    public void setPcsPerBox(Double pcsPerBox) { this.pcsPerBox = pcsPerBox; }

    public Double getPcs() { return pcs; }
    public void setPcs(Double pcs) { this.pcs = pcs; }

    public Double getOriginalPcs() { return originalPcs; }
    public void setOriginalPcs(Double originalPcs) { this.originalPcs = originalPcs; }

    public Double getRate() { return rate; }
    public void setRate(Double rate) { this.rate = rate; }

    public Double getAmt() { return amt; }
    public void setAmt(Double amt) { this.amt = amt; }

    public Double getReturnQty() { return returnQty; }
    public void setReturnQty(Double returnQty) { this.returnQty = returnQty; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}