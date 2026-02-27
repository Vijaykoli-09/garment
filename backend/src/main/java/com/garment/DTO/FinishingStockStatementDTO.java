package com.garment.DTO;


import java.time.LocalDate;
import java.util.List;
import lombok.Data;

@Data
public class FinishingStockStatementDTO {
    private Long id;
    private String partyName;
    private String itemName;
    private LocalDate fromDate;
    private LocalDate toDated;
    private List<FinishingStockStatementDataDTO> rows;
    
}
