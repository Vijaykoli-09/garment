package com.garment.DTO;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PurchasePendingRowDTO {
	  private Long id;                 // any stable id (we’ll use min(poi.id))
	  private String orderNo;
	  private LocalDate orderDate;
	  private String partyName;
	  private String itemName;
	  private Double orderReceived;    // PO quantity
	  private Double orderDelivered;   // SUM of PE.wtPerBox
	  private Double orderPending;     // received - delivered
}
