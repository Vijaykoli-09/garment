package com.garment.DTO;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CuttingEntryListDTO {
    private String serialNo;
    private LocalDate date;
    private String employeeName;
    private String issueTo;
    private String issueBranchName;
    private String totalPcs;
    private String totalConsumption;
    private String totalKho;
    private String totalConsAmount;
    private String lotNos;
}
