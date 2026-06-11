package com.garment.DTO;

import java.time.LocalDate;
import java.util.List;

import lombok.Data;

@Data
public class MaterialPurchasePendingRequest {
    private LocalDate date;        // as on date
    private List<Long> partyIds;   // optional
    private List<Long> itemIds;    // optional (material ids)
}