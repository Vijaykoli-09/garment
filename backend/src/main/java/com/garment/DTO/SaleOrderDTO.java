package com.garment.DTO;

import java.time.LocalDate;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor
public class SaleOrderDTO {
    private Long id;
    private String orderNo;
    private LocalDate dated;
    private LocalDate deliveryDate;
    private Long partyId;
    private String partyName;
    private String remarks;
    private Integer totalPeti;
    private Integer totalPcs;
    private List<SaleOrderRowDTO> rows;
}