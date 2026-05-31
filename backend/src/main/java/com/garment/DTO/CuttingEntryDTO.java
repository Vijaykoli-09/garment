package com.garment.DTO;

import lombok.*;
import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CuttingEntryDTO {
    private String serialNo;
    private LocalDate date;
    private String employeeId;
    private String employeeName;

    private String totalPcs;
    private String totalCuttingAmount;
    private String totalConsumption;
    private String totalKho;
    private String totalConsAmount;

    private String issueTo;
    private Long issueBranchId;
    private String issueBranchName;

    private List<CuttingLotRowDTO> lotRows;
    private List<CuttingStockRowDTO> stockRows;

    // ✅ NEW
    private List<CuttingSizeRowDTO> sizeRows;
}