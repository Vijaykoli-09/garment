package com.garment.DTO;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CuttingSizeRowDTO {
    private Long id;
    private Integer lotSno;     // CuttingLotRow sno
    private String size;
    private String box;
    private String pcsPerBox;
    private String totalPcs;
}