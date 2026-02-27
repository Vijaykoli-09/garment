package com.garment.DTO;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class JobOutwardChallanResponseDTO {
    private String serialNo;
    private String orderChallanNo;
    private Long partyId;
    private String partyName;
    private String processSerialNo;
    private String processName;
    private LocalDate date;
    private String remarks1;
    private String remarks2;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<JobOutwardChallanRowResponseDTO> rows;
}
