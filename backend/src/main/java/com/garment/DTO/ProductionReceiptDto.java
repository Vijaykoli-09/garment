package com.garment.DTO;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProductionReceiptDto {
    private String voucherNo;
    private String dated; // frontend sends date string -> parse in service
    private String employeeName;
    private String processName;
    private Boolean randomEntry;
    private List<ProductionReceiptRowDto> rows;
}
