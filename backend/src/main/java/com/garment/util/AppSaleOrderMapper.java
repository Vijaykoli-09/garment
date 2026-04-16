package com.garment.util;

import com.garment.DTO.AppOrderItemRequest;
import com.garment.DTO.SaleOrderSaveDTO;
import com.garment.DTO.SaleOrderSaveDTO.SaleOrderSaveRowDTO;
import com.garment.entity.AppOrder;
import com.garment.entity.AppOrderItem;
import com.garment.entity.CustomerRegistration;
import com.garment.entity.Product;
import com.garment.model.Shade;
import com.garment.repository.ProductRepository;
import com.garment.repository.ShadeRepository;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Utility to convert App Orders (from mobile app) into SaleOrderSaveDTO
 * for creation in the web admin's sale order system.
 */
public class AppSaleOrderMapper {

    private final ProductRepository productRepo;
    private final ShadeRepository shadeRepo;

    public AppSaleOrderMapper(ProductRepository productRepo, ShadeRepository shadeRepo) {
        this.productRepo = productRepo;
        this.shadeRepo = shadeRepo;
    }

    /**
     * Converts an AppOrder (mobile) to SaleOrderSaveDTO (web admin format).
     * 
     * IMPORTANT: Each size becomes a SEPARATE row in the sale order.
     * If customer ordered:
     *   - Product A, Shade Red, Size M (3 boxes)
     *   - Product A, Shade Red, Size L (5 boxes)
     * 
     * This creates 2 separate SaleOrderSaveRowDTO entries.
     */
    public SaleOrderSaveDTO convertToSaleOrder(AppOrder appOrder) {
        CustomerRegistration customer = appOrder.getCustomer();

        SaleOrderSaveDTO dto = new SaleOrderSaveDTO();
        
        // orderNo: null → backend auto-generates using nextOrderNo()
        dto.setOrderNo(null);
        
        // dated: current date in yyyy-MM-dd format
        dto.setDated(LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE));
        
        // deliveryDate: null → admin sets it later in web
        dto.setDeliveryDate(null);
        
        // Party info
        dto.setPartyId(customer.getPartyId());
        dto.setPartyName(customer.getFullName());
        
        // Remarks: indicate this is from app + payment status
        String paymentInfo = appOrder.getPaymentStatus().name().equals("PAID") 
                ? "Paid" 
                : "Payment Pending";
        dto.setRemarks("App Order - " + paymentInfo + " - Payment: " + appOrder.getPaymentMethod().name());
        
        // Convert items to rows (each size = separate row)
        dto.setRows(convertItemsToRows(appOrder.getItems()));
        
        return dto;
    }

    /**
     * Converts AppOrderItems to SaleOrderSaveRowDTO list.
     * Each item (which has ONE size) becomes ONE row.
     * Groups items by productId + shadeCode + size.
     */
    private List<SaleOrderSaveRowDTO> convertItemsToRows(List<AppOrderItem> items) {
        List<SaleOrderSaveRowDTO> rows = new ArrayList<>();
        
        // Group items by: productId + size
        // (Each size gets its own row in sale order)
        for (AppOrderItem item : items) {
            SaleOrderSaveRowDTO row = convertItemToRow(item);
            if (row != null) {
                rows.add(row);
            }
        }
        
        return rows;
    }

    /**
     * Converts a single AppOrderItem to SaleOrderSaveRowDTO.
     * Fetches product details from DB to get art info and shade details.
     */
    private SaleOrderSaveRowDTO convertItemToRow(AppOrderItem item) {
        // Fetch product to get art details
        Optional<Product> productOpt = productRepo.findById(item.getProductId());
        if (productOpt.isEmpty()) {
            // Product not found - skip this item
            return null;
        }
        
        Product product = productOpt.get();
        
        SaleOrderSaveRowDTO row = new SaleOrderSaveRowDTO();
        
        // Art fields from product
        row.setArtSerial(product.getArtSerialNumber());
        row.setArtNo(product.getArtNo());
        row.setDescription(product.getDescription());
        
        // Shade: Get from product name pattern (extract shade from productName)
        // Product name format: "{artName} - {shadeName}"
        // e.g., "Cotton T-Shirt - Red"
        String shade = extractShadeFromProductName(item.getProductName(), product);
        row.setShade(shade);
        
        // Peti (boxes): Calculate from quantity and boxQuantity
        // quantity = total pieces ordered
        // boxQuantity = pieces per box from product
        Integer boxQuantity = product.getBoxQuantity() != null ? product.getBoxQuantity() : 1;
        int boxes = (int) Math.ceil((double) item.getQuantity() / boxQuantity);
        row.setPeti(String.valueOf(boxes));
        
        // Remarks: empty (not needed for app orders)
        row.setRemarks("");
        
        // Sizes: Map with ONE size (this item's size)
        Map<String, String> sizesQty = new HashMap<>();
        Map<String, String> sizesRate = new HashMap<>();
        
        // The key is the size name (e.g., "M", "L", "XL")
        String sizeName = item.getSelectedSize();
        
        // Quantity: total pieces for this size
        sizesQty.put(sizeName, String.valueOf(item.getQuantity()));
        
        // Rate: pricePerBox (calculate from pricePerPc * boxQuantity)
        double pricePerBox = item.getPricePerPc() * boxQuantity;
        sizesRate.put(sizeName, String.valueOf(pricePerBox));
        
        row.setSizesQty(sizesQty);
        row.setSizesRate(sizesRate);
        
        return row;
    }

    /**
     * Extracts shade name from product name or uses product's first shade.
     * Format: "Product Name - ShadeName" → extracts "ShadeName"
     * Or fetches from product's shade list.
     */
    private String extractShadeFromProductName(String productName, Product product) {
        // Strategy 1: Parse from product name (format: "Name - Shade")
        if (productName != null && productName.contains(" - ")) {
            String[] parts = productName.split(" - ", 2);
            if (parts.length == 2) {
                String shadeName = parts[1].trim();
                
                // Try to find shade in DB to get both name and code
                Optional<Shade> shadeOpt = shadeRepo.findByShadeNameIgnoreCase(shadeName);
                if (shadeOpt.isPresent()) {
                    Shade shade = shadeOpt.get();
                    // Return format: "ShadeName (ShadeCode)"
                    return shadeName + " (" + shade.getShadeCode() + ")";
                }
                
                // If shade not found in DB, just return the name
                return shadeName;
            }
        }
        
        // Strategy 2: Use product's first shade (if available)
        if (product.getShades() != null && !product.getShades().isBlank()) {
            String[] shadeCodes = product.getShades().split(",");
            if (shadeCodes.length > 0) {
                String firstShadeCode = shadeCodes[0].trim();
                Optional<Shade> shadeOpt = shadeRepo.findByShadeCode(firstShadeCode);
                if (shadeOpt.isPresent()) {
                    Shade shade = shadeOpt.get();
                    return shade.getShadeName() + " (" + shade.getShadeCode() + ")";
                }
            }
        }
        
        // Fallback: return empty string
        return "";
    }
}