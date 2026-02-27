package com.garment.DTO;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProductionReceiptRowDto {
    private String cardNo;
    private String artNo;
    private String Size;        // use capital "Size" to match frontend property
    private String pcs;
    private String originalPcs;
    private String weightage;
    private String rate;
    private String amount;
    private String remarks;
}
