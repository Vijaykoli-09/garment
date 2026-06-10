package com.garment.DTO;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SizeStockTransferRequest {

    // required
    private String adjDate;        // YYYY-MM-DD
    private String artNo;
    private String shadeName;
    private String fromSizeName;
    private String toSizeName;
    private BigDecimal qty;        // > 0

    // optional (for better data)
    private String ref;
    private String remarks;

    private String artSerial;
    private String artGroup;
    private String artName;

    private String shadeCode;

    private String fromSizeSerial;
    private String toSizeSerial;

    private BigDecimal perBox;
    private BigDecimal rate;
}