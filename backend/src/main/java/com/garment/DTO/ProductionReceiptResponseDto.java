package com.garment.DTO;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProductionReceiptResponseDto {
    private Long id;
    private String voucherNo;
    private String dated; // send back as ISO string yyyy-MM-dd
    private String employeeName;
    private String processName;
    private Boolean randomEntry;
    private List<ProductionReceiptRowDto> rows;
}
