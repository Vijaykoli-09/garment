
package com.garment.DTO;

import java.time.LocalDate;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Slim sale-order index (party + date + art numbers only) for the Pendency screen's
 * "available arts" filter. Same shape the screen already reads from GET /api/sale-orders:
 * partyId, dated, rows[].artNo.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaleOrderArtIndexDTO {
    private Long partyId;
    private LocalDate dated;
    private List<ArtRef> rows;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ArtRef {
        private String artNo;
    }
}