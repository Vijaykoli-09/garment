package com.garment.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record DispatchReturnChallanDTO(
        Long id,
        String serialNo,
        LocalDate date,
        String challanNo,
        String partyName,
        String brokerName,
        String transportName,
        String dispatchedBy,
        String station,
        String remarks1,
        String remarks2,

        Integer challanYear,
        Integer challanSeq,
        Integer serialYear,
        Integer serialSeq,
        
        BigDecimal totalAmt,
        BigDecimal discount,
        BigDecimal discountPercent,
        BigDecimal tax,
        BigDecimal taxPercent,
        BigDecimal cartage,
        BigDecimal netAmt,
        List<DispatchReturnRowDTO> rows,
        List<DispatchReturnPackingRowDTO> packingRows
) {}