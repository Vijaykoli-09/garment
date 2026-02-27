package com.garment.DTO;

import java.util.List;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor
public class SaleOrderReturnSaveDTO {
    private String returnNo;        // client may send; server can also generate
    private String dated;           // yyyy-MM-dd
    private Long partyId;           // optional
    private String partyName;
    private String remarks;
    private List<SaleOrderReturnSaveRowDTO> rows;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class SaleOrderReturnSaveRowDTO {
        private Long saleOrderId;       // optional
        private Long saleOrderRowId;    // optional
        private String artSerial;
        private String artNo;
        private String description;
        private String shade;           // shadeName from UI
        private String returnPeti;      // string -> int
        private String reason;
        private String remarks;
        private Map<String, String> sizesQty;  // per-size qty (unit) map
    }
}