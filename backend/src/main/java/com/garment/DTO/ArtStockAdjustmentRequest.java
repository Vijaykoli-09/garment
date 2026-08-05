package com.garment.DTO;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ArtStockAdjustmentRequest {
    private String adjDate;     // YYYY-MM-DD (required)
    private String artSerial;
    private String artGroup;
    private String artNo;       // required
    private String artName;

    private String shadeCode;
    private String shadeName;   // required

    private String sizeSerial;
    private String sizeName;    // required

    private BigDecimal pcsDelta; // required
    private BigDecimal perBox;   // optional
    private BigDecimal rate;     // optional

    private String remarks;      // optional
}