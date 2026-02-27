package com.garment.DTO;

import java.time.LocalDate;
import java.util.List;

import lombok.Data;

@Data
public class OrderSettleDTO {
    private Long id;
    private String challanNo;
    private LocalDate dated;
    private Long partyId;
    private String partyName;
    private String broker;
    private String transport;
    private String remarks1;

    private List<OrderSettleRowDTO> rows;
}