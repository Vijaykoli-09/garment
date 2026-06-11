package com.garment.DTO;

import com.garment.model.ArtStockAdjustment;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SizeStockTransferResponse {
    private String ref;
    private ArtStockAdjustment outRow;
    private ArtStockAdjustment inRow;
}