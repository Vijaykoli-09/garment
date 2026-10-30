package com.garment.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;

public class SelfTransferDTO {
    private Long id;
    private LocalDate transferDate;
    private Long fromPaymentModeId;
    private Long toPaymentModeId;
    private String fromAccountType;
    private String toAccountType;
    private String fromAccountName;
    private String toAccountName;
    private BigDecimal amount;
    private String referenceNo;
    private String narration;
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
}
