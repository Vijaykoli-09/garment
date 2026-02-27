package com.garment.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
public class JobInwardChallanRequest {
    private String date; // expect yyyy-MM-dd
    private String challanNo; // manual input from frontend
    private String partyId; // frontend sends string; we'll parse to Long if numeric
    private String processId;
    private String artHeader;
    private String remarks;
    private String adjustLot;
    private List<RowRequest> rows;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RowRequest {
        public String cuttinglotNumber;
        public String cuttingDozen;
        public String artNo;
        public String sizeName;
        public Integer pcs;
        public String wastage;
        public String rate; // frontend sends string, map to BigDecimal
        public String amount;
    }
}
