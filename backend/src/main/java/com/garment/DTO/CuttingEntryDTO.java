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
    private String totalKho;          // header total
    private String totalConsAmount;

    // NEW: Issue To + Branch
    private String issueTo;           // "Inside" | "Outside"
    private Long issueBranchId;       // Location id
    private String issueBranchName;   // Branch name snapshot

    private List<CuttingLotRowDTO> lotRows;
    private List<CuttingStockRowDTO> stockRows;
}