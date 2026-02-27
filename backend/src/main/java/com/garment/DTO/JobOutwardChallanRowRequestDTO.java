package com.garment.DTO;

import lombok.Data;

import java.time.LocalDate;

@Data
public class JobOutwardChallanRowRequestDTO {
    private Long id; // optional for updates
    private Integer sno;
    private String cutLotNo;
    private String artNo;
    private String cuttingDozenPcs;
    private String size;
    private String pcs;
    private String narration;
    private LocalDate targetDate;
}
