package com.garment.DTO;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MaterialPurchasePendingRowDTO {
    private Long id;
    private String orderNo;
    private LocalDate orderDate;
    private String partyName;
    private String itemName;
    private Double orderReceived;
    private Double orderDelivered;
    private Double orderPending;
}