package com.garment.DTO;


import java.time.LocalDate;
import java.util.List;
import lombok.Data;

@Data
public class FinishingAmountStatementDTO {
    private Long id;
    private String partyName;
    private LocalDate fromDate;
    private LocalDate toDate;
    private List<FinishingAmountStatementDataDTO> rows;
}
