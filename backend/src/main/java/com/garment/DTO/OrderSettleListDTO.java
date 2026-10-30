package com.garment.DTO;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderSettleListDTO {
    private Long id;
    private String challanNo;
    private LocalDate dated;
    private Long partyId;
    private String partyName;
}
