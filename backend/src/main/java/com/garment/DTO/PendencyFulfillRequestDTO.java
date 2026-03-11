package com.garment.DTO;

import lombok.Data;

import java.util.List;

@Data
public class PendencyFulfillRequestDTO {

    private String fromDate;
    private String toDate;

    private List<SaleOrderPendencyRowDTO> rows;
}