package com.garment.DTO;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class JobOutwardChallanRequestDTO {
    private String serialNo; // optional; if blank, server will generate
    private String orderChallanNo;
    private Long partyId; // Party.id
    private String processSerialNo; // Process.serialNo
    private LocalDate date;
    private String remarks1;
    private String remarks2;
    private List<JobOutwardChallanRowRequestDTO> rows;
}
