package com.garment.DTO;

import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonFormat;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MaterialPurchasePendingRowDTO {
    private Long id;
    private String orderNo;
     @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "dd-MM-yyyy")
    private LocalDate orderDate;
    private String partyName;
    private String itemName;
    private Double orderReceived;
    private Double orderDelivered;
    private Double orderPending;
}