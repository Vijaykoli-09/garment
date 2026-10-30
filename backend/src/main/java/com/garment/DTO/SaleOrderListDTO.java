package com.garment.DTO;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaleOrderListDTO {
    private Long id;
    private String orderNo;
    private LocalDate dated;
    private LocalDate deliveryDate;
    private Long partyId;
    private String partyName;
    private Integer totalPeti;
    private Integer totalPcs;
}
