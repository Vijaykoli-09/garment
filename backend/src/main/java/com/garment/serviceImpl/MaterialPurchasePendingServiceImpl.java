// package com.garment.serviceImpl;

// import java.math.BigDecimal;
// import java.sql.Date;
// import java.time.LocalDate;
// import java.util.List;

// import org.springframework.stereotype.Service;

// import com.garment.DTO.MaterialPurchasePendingRequest;
// import com.garment.DTO.MaterialPurchasePendingRowDTO;
// import com.garment.repository.MaterialPurchasePendingRepository;
// import com.garment.service.MaterialPurchasePendingService;

// import lombok.RequiredArgsConstructor;

// @Service
// @RequiredArgsConstructor
// public class MaterialPurchasePendingServiceImpl implements MaterialPurchasePendingService {

//    private final MaterialPurchasePendingRepository repo;

//    @Override
//    public List<Object[]> getMaterials() {
//        return repo.listMaterials();
//    }

//    @Override
//    public List<MaterialPurchasePendingRowDTO> getPending(MaterialPurchasePendingRequest req) {
//        if (req.getDate() == null) throw new IllegalArgumentException("date is required");
//        if (req.getPartyIds() == null || req.getPartyIds().isEmpty())
//            throw new IllegalArgumentException("partyIds is required");

//        final List<Object[]> raw;
//        if (req.getItemIds() == null || req.getItemIds().isEmpty()) {
//            raw = repo.pendingAllItems(req.getDate(), req.getPartyIds());
//        } else {
//            raw = repo.pendingWithItems(req.getDate(), req.getPartyIds(), req.getItemIds());
//        }

//        return raw.stream().map(r -> new MaterialPurchasePendingRowDTO(
//                toLong(r[0]),
//                toStr(r[1]),
//                toLocalDate(r[2]),
//                toStr(r[3]),
//                toStr(r[4]),
//                toDouble(r[5]),
//                toDouble(r[6]),
//                toDouble(r[7])
//        )).toList();
//    }

//    private Long toLong(Object o) {
//        return o == null ? null : ((Number) o).longValue();
//    }

//    private String toStr(Object o) {
//        return o == null ? "" : o.toString();
//    }

//    private Double toDouble(Object o) {
//        if (o == null) return 0.0;
//        if (o instanceof BigDecimal bd) return bd.doubleValue();
//        if (o instanceof Number n) return n.doubleValue();
//        return Double.parseDouble(o.toString());
//    }

//    private LocalDate toLocalDate(Object o) {
//        if (o == null) return null;
//        if (o instanceof LocalDate ld) return ld;
//        if (o instanceof Date d) return d.toLocalDate();
//        // last resort (if DB returns String)
//        return LocalDate.parse(o.toString());
//    }
// }