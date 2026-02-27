package com.garment.DTO;

import java.util.List;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor
public class SaleOrderSaveDTO {
    private String orderNo;         // client may send; server can also generate
    private String dated;           // yyyy-MM-dd
    private String deliveryDate;    // yyyy-MM-dd (nullable)
    private Long partyId;           // optional
    private String partyName;
    private String remarks;
    private List<SaleOrderSaveRowDTO> rows;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class SaleOrderSaveRowDTO {
        private String artSerial;
        private String artNo;
        private String shade;         // shadeName from UI
        private String description;
        private String peti;          // string -> int
        private String remarks;
        private Map<String, String> sizes;     // legacy qty
        private Map<String, String> sizesQty;  // qty
        private Map<String, String> sizesRate; // rate
    }
}