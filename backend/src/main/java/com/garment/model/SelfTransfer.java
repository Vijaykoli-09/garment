package com.garment.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "self_transfers")
public class SelfTransfer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private LocalDate transferDate;
    private Long fromPaymentModeId;
    private Long toPaymentModeId;
    @Column(nullable = false, length = 10) private String fromAccountType;
    @Column(nullable = false, length = 10) private String toAccountType;
    @Column(length = 250) private String fromAccountName;
    @Column(length = 250) private String toAccountName;
    @Column(nullable = false, precision = 15, scale = 2) private BigDecimal amount;
    @Column(length = 150) private String referenceNo;
    @Column(length = 1000) private String narration;
    @Column(nullable = false, updatable = false) private LocalDateTime createdAt;
    @PrePersist void prePersist() { if (createdAt == null) createdAt = LocalDateTime.now(); }

    public Long getId(){return id;} public void setId(Long v){id=v;}
    public LocalDate getTransferDate(){return transferDate;} public void setTransferDate(LocalDate v){transferDate=v;}
    public Long getFromPaymentModeId(){return fromPaymentModeId;} public void setFromPaymentModeId(Long v){fromPaymentModeId=v;}
    public Long getToPaymentModeId(){return toPaymentModeId;} public void setToPaymentModeId(Long v){toPaymentModeId=v;}
    public String getFromAccountType(){return fromAccountType;} public void setFromAccountType(String v){fromAccountType=v;}
    public String getToAccountType(){return toAccountType;} public void setToAccountType(String v){toAccountType=v;}
    public String getFromAccountName(){return fromAccountName;} public void setFromAccountName(String v){fromAccountName=v;}
    public String getToAccountName(){return toAccountName;} public void setToAccountName(String v){toAccountName=v;}
    public BigDecimal getAmount(){return amount;} public void setAmount(BigDecimal v){amount=v;}
    public String getReferenceNo(){return referenceNo;} public void setReferenceNo(String v){referenceNo=v;}
    public String getNarration(){return narration;} public void setNarration(String v){narration=v;}
    public LocalDateTime getCreatedAt(){return createdAt;} public void setCreatedAt(LocalDateTime v){createdAt=v;}
}
