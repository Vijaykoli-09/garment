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
public class JobInwardChallanResponse {
    private Long id;
    private String date; // yyyy-MM-dd
    private String challanNo;
    private String partyId;
    private String processId;
    private String artHeader;
    private String remarks;
    private String adjustLot;
    private List<RowResponse> rows;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RowResponse {
        public Long id;
        public Integer seq;
        public String cuttinglotNumber;
        public String cuttingDozen;
        public String artNo;
        public String sizeName;
        public Integer pcs;
        public String wastage;
        public String rate;
        public String amount;
    }
}
