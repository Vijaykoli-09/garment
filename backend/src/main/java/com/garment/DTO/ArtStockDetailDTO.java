package com.garment.DTO;

import java.util.ArrayList;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Slim view of an Art for stock screens (opening stock). Same field names the web
 * screen already reads from GET /api/arts/{serial}: artNo, artName, shades[].shadeName,
 * sizeDetails[].sizeName/box/pcs and sizes[].sizeName.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ArtStockDetailDTO {
    private String serialNumber;
    private String artNo;
    private String artName;
    private List<ShadeItem> shades = new ArrayList<>();
    private List<SizeItem> sizes = new ArrayList<>();
    private List<SizeDetailItem> sizeDetails = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ShadeItem {
        private String shadeName;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SizeItem {
        private String sizeName;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SizeDetailItem {
        private String sizeName;
        private String box;
        private String pcs;
    }
}