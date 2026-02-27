package com.garment.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sale_order_returns")
public class SaleOrderReturn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String returnNo;

    private LocalDate date;
    private String partyName;
    private String brokerName;
    private String transportName;
    private String receivedBy;
    private String remarks1;
    private String remarks2;

    private Double totalAmt = 0.0;
    private Double discount = 0.0;
    private Double discountPercent = 0.0;
    private Double tax = 0.0;
    private Double taxPercent = 0.0;
    private Double cartage = 0.0;
    private Double netAmt = 0.0;

    @OneToMany(mappedBy = "saleOrderReturn", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SaleOrderReturnRow> rows = new ArrayList<>();

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getReturnNo() { return returnNo; }
    public void setReturnNo(String returnNo) { this.returnNo = returnNo; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getPartyName() { return partyName; }
    public void setPartyName(String partyName) { this.partyName = partyName; }

    public String getBrokerName() { return brokerName; }
    public void setBrokerName(String brokerName) { this.brokerName = brokerName; }

    public String getTransportName() { return transportName; }
    public void setTransportName(String transportName) { this.transportName = transportName; }

    public String getReceivedBy() { return receivedBy; }
    public void setReceivedBy(String receivedBy) { this.receivedBy = receivedBy; }

    public String getRemarks1() { return remarks1; }
    public void setRemarks1(String remarks1) { this.remarks1 = remarks1; }

    public String getRemarks2() { return remarks2; }
    public void setRemarks2(String remarks2) { this.remarks2 = remarks2; }

    public Double getTotalAmt() { return totalAmt; }
    public void setTotalAmt(Double totalAmt) { this.totalAmt = totalAmt; }

    public Double getDiscount() { return discount; }
    public void setDiscount(Double discount) { this.discount = discount; }

    public Double getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(Double discountPercent) { this.discountPercent = discountPercent; }

    public Double getTax() { return tax; }
    public void setTax(Double tax) { this.tax = tax; }

    public Double getTaxPercent() { return taxPercent; }
    public void setTaxPercent(Double taxPercent) { this.taxPercent = taxPercent; }

    public Double getCartage() { return cartage; }
    public void setCartage(Double cartage) { this.cartage = cartage; }

    public Double getNetAmt() { return netAmt; }
    public void setNetAmt(Double netAmt) { this.netAmt = netAmt; }

    public List<SaleOrderReturnRow> getRows() { return rows; }
    public void setRows(List<SaleOrderReturnRow> rows) {
        this.rows.clear();
        if (rows != null) {
            this.rows.addAll(rows);
            this.rows.forEach(row -> row.setSaleOrderReturn(this));
        }
    }
}