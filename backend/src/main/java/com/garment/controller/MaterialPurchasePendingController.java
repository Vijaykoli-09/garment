// package com.garment.controller;

// import java.util.HashMap;
// import java.util.List;
// import java.util.Map;
// import java.util.stream.Collectors;

// import org.springframework.http.ResponseEntity;
// import org.springframework.web.bind.annotation.CrossOrigin;
// import org.springframework.web.bind.annotation.GetMapping;
// import org.springframework.web.bind.annotation.PostMapping;
// import org.springframework.web.bind.annotation.RequestBody;
// import org.springframework.web.bind.annotation.RequestMapping;
// import org.springframework.web.bind.annotation.RestController;

// import com.garment.DTO.MaterialPurchasePendingRequest;
// import com.garment.DTO.MaterialPurchasePendingRowDTO;
// import com.garment.service.MaterialPurchasePendingService;

// import lombok.RequiredArgsConstructor;

// @RestController
// @RequestMapping("/api/purchase")
// @RequiredArgsConstructor
// @CrossOrigin(origins = "http://localhost:3000")
// public class MaterialPurchasePendingController {

//    private final MaterialPurchasePendingService service;

//    // React: GET /purchase/orders/list  -> actual: /api/purchase/orders/list
//    @GetMapping("/orders/order-list")
//    public ResponseEntity<List<Map<String, Object>>> orderItems() {
//        List<Object[]> raw = service.getMaterials();

//        List<Map<String, Object>> list = raw.stream()
//                .map(a -> {
//                    Map<String, Object> m = new HashMap<>();
//                    m.put("id", a[0] == null ? null : ((Number) a[0]).longValue());
//                    m.put("itemName", (a.length > 1 && a[1] != null) ? a[1].toString() : "");
//                    return m;
//                })
//                .collect(Collectors.toList());

//        return ResponseEntity.ok(list);
//    }

//    // React: POST /purchase/pending-order-item -> actual: /api/purchase/pending-order-item
//    @PostMapping("/pending-order-item")
//    public ResponseEntity<List<MaterialPurchasePendingRowDTO>> pending(
//            @RequestBody MaterialPurchasePendingRequest req) {
//        return ResponseEntity.ok(service.getPending(req));
//    }
// }