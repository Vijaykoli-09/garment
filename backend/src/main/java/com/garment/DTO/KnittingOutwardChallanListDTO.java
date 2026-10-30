package com.garment.DTO;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class KnittingOutwardChallanListDTO {
    private Long id;
    private String challanNo;
    private LocalDate date;
    private String partyName;
    private String yarnNames;
    private String materialNames;
    private Long totalWtPerBox;
    private Double totalAmount;
}
