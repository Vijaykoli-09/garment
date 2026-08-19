package com.garment.DTO;

import java.math.BigDecimal;

public record DispatchReturnPackingRowDTO(
        Long id,
        String itemName,
        BigDecimal quantity
) {}