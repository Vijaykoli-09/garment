package com.garment.service;

import com.garment.DTO.AppOrderItemRequest;
import com.garment.DTO.AppOrderResponse;
import com.garment.DTO.AppRazorpayOrderRequest;
import com.garment.DTO.AppVerifyPaymentRequest;
import com.garment.entity.CustomerRegistration;
import com.garment.entity.AppOrder;
import com.garment.entity.AppOrder.OrderStatus;
import com.garment.entity.AppOrder.PaymentMethod;
import com.garment.entity.AppOrder.PaymentStatus;
import com.garment.entity.AppOrderItem;
import com.garment.repository.CustomerRegistrationRepository;
import com.garment.repository.AppOrderRepository;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;

@Service
public class AppOrderService {

    private final AppOrderRepository orderRepo;
    private final CustomerRegistrationRepository customerRepo;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    public AppOrderService(AppOrderRepository orderRepo,
                           CustomerRegistrationRepository customerRepo) {
        this.orderRepo    = orderRepo;
        this.customerRepo = customerRepo;
    }

    // ════════════════════════════════════════════════════════════════
    // STEP 1 — Create Razorpay order + save pending Order in DB
    // ════════════════════════════════════════════════════════════════
    @Transactional
    public AppOrderResponse createRazorpayOrder(String customerPhone, AppRazorpayOrderRequest req) {

        // 1. Load customer
        CustomerRegistration customer = customerRepo.findByPhone(customerPhone)
                .orElseThrow(() -> new RuntimeException("Customer not found."));

        // 2. Calculate totals
        double subtotal    = req.getItems().stream()
                .mapToDouble(i -> i.getPricePerPc() * i.getQuantity())
                .sum();
        double gstAmount   = subtotal * 0.18;
        double totalAmount = subtotal + gstAmount;

        // 3. Parse and validate payment method
        PaymentMethod method = parsePaymentMethod(req.getPaymentMethod());

        if (method == PaymentMethod.CREDIT_ORDER || method == PaymentMethod.ADVANCE_CREDIT) {
            if (!Boolean.TRUE.equals(customer.getCreditEnabled())) {
                throw new RuntimeException("Credit is not enabled for your account.");
            }
            double creditLimit  = customer.getCreditLimit() != null ? customer.getCreditLimit() : 0.0;
            // CREDIT_ORDER: full amount from credit
            // ADVANCE_CREDIT: only 70% from credit, 30% paid via Razorpay
            double creditNeeded = (method == PaymentMethod.CREDIT_ORDER)
                    ? totalAmount
                    : totalAmount * 0.70;
            if (creditNeeded > creditLimit) {
                throw new RuntimeException("Order amount exceeds your credit limit of ₹" + creditLimit);
            }
        }

        // 4. Create Razorpay order
        //
        // ╔═══════════════════════════════════════════════════════════════╗
        // ║  BUG FIX 1 — ADVANCE_CREDIT amount mismatch                 ║
        // ║                                                               ║
        // ║  OLD (broken): always creates order for full totalAmount.    ║
        // ║  For ADVANCE_CREDIT, mobile then passes 30% to checkout.    ║
        // ║  Razorpay order_id is LOCKED to the amount it was created   ║
        // ║  for. Passing a different amount = "payment failed".         ║
        // ║                                                               ║
        // ║  FIX: create Razorpay order for the EXACT amount that will  ║
        // ║  be charged via Razorpay:                                    ║
        // ║    • ADVANCE_CREDIT  → 30% of totalAmount                   ║
        // ║    • All other methods → full totalAmount                    ║
        // ╚═══════════════════════════════════════════════════════════════╝
        //
        // ╔═══════════════════════════════════════════════════════════════╗
        // ║  BUG FIX 2 — int overflow for large orders                  ║
        // ║                                                               ║
        // ║  OLD: (int)(totalAmount * 100)                               ║
        // ║  If order > ₹21,474 this overflows Java's int max value.    ║
        // ║  FIX: (long) Math.round(amount * 100)                       ║
        // ╚═══════════════════════════════════════════════════════════════╝

        String razorpayOrderId = null;
        boolean needsRazorpay  = (method != PaymentMethod.CREDIT_ORDER);

        if (needsRazorpay) {
            double razorpayAmount = (method == PaymentMethod.ADVANCE_CREDIT)
                    ? totalAmount * 0.30   // only the advance portion goes through Razorpay
                    : totalAmount;         // full amount for UPI/card/bank

            try {
                RazorpayClient client = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
                JSONObject options    = new JSONObject();
                options.put("amount",          (long) Math.round(razorpayAmount * 100)); // paise, no overflow
                options.put("currency",        "INR");
                options.put("receipt",         "rcpt_" + System.currentTimeMillis());
                options.put("payment_capture", 1); // auto-capture after payment success

                com.razorpay.Order rzpOrder = client.orders.create(options);
                razorpayOrderId = rzpOrder.get("id");
            } catch (RazorpayException e) {
                throw new RuntimeException("Failed to create Razorpay order: " + e.getMessage());
            }
        }

        // 5. Build and save Order entity
        AppOrder order = new AppOrder();
        order.setCustomer(customer);
        order.setSubtotal(subtotal);
        order.setGstAmount(gstAmount);
        order.setTotalAmount(totalAmount);
        order.setPaymentMethod(method);
        order.setPaymentStatus(PaymentStatus.PENDING);
        order.setOrderStatus(OrderStatus.PENDING);
        order.setRazorpayOrderId(razorpayOrderId);
        order.setDeliveryAddress(
                req.getDeliveryAddress() != null ? req.getDeliveryAddress() : customer.getDeliveryAddress()
        );
        order.setCreatedAt(LocalDateTime.now());

        if (method == PaymentMethod.ADVANCE_CREDIT) {
            order.setAdvanceAmount(totalAmount * 0.30);
            order.setCreditAmount(totalAmount * 0.70);
        } else if (method == PaymentMethod.CREDIT_ORDER) {
            order.setCreditAmount(totalAmount);
        }

        // 6. Attach items
        for (AppOrderItemRequest itemReq : req.getItems()) {
            AppOrderItem item = new AppOrderItem();
            item.setOrder(order);
            item.setProductId(itemReq.getProductId());
            item.setProductName(itemReq.getProductName());
            item.setSelectedSize(itemReq.getSelectedSize());
            item.setQuantity(itemReq.getQuantity());
            item.setPricePerPc(itemReq.getPricePerPc());
            item.setItemTotal(itemReq.getPricePerPc() * itemReq.getQuantity());
            order.getItems().add(item);
        }

        AppOrder saved = orderRepo.save(order);

        // Always return full totalAmount to mobile — mobile uses data.totalAmount for display
        return new AppOrderResponse(
                saved.getId(),
                razorpayOrderId,
                needsRazorpay ? razorpayKeyId : null,
                totalAmount,
                saved.getOrderStatus().name(),
                saved.getPaymentStatus().name(),
                saved.getPaymentMethod().name(),
                saved.getCreatedAt().toString()
        );
    }

    // ════════════════════════════════════════════════════════════════
    // STEP 2 — Verify Razorpay HMAC-SHA256 signature
    // ════════════════════════════════════════════════════════════════
    @Transactional
    public AppOrderResponse verifyPayment(AppVerifyPaymentRequest req) {

        AppOrder order = orderRepo.findByRazorpayOrderId(req.getRazorpayOrderId())
                .orElseThrow(() -> new RuntimeException(
                        "Order not found for Razorpay ID: " + req.getRazorpayOrderId()));

        // Razorpay signature = HMAC-SHA256 of "razorpay_order_id|razorpay_payment_id"
        String payload = req.getRazorpayOrderId() + "|" + req.getRazorpayPaymentId();
        boolean valid  = verifySignature(payload, req.getRazorpaySignature(), razorpayKeySecret);

        if (!valid) {
            order.setPaymentStatus(PaymentStatus.FAILED);
            orderRepo.save(order);
            throw new RuntimeException("Payment verification failed. Invalid signature.");
        }

        order.setRazorpayPaymentId(req.getRazorpayPaymentId());
        order.setRazorpaySignature(req.getRazorpaySignature());
        order.setPaymentStatus(PaymentStatus.PAID);
        order.setOrderStatus(OrderStatus.ACCEPTED);
        order.setUpdatedAt(LocalDateTime.now());

        AppOrder saved = orderRepo.save(order);

        return new AppOrderResponse(
                saved.getId(),
                saved.getRazorpayOrderId(),
                null,
                saved.getTotalAmount(),
                saved.getOrderStatus().name(),
                saved.getPaymentStatus().name(),
                saved.getPaymentMethod().name(),
                saved.getCreatedAt().toString()
        );
    }

    // ════════════════════════════════════════════════════════════════
    // GET — Customer's own orders
    // ════════════════════════════════════════════════════════════════
    public List<AppOrderResponse> getMyOrders(String customerPhone) {
        CustomerRegistration customer = customerRepo.findByPhone(customerPhone)
                .orElseThrow(() -> new RuntimeException("Customer not found."));
        return orderRepo.findByCustomerIdOrderByCreatedAtDesc(customer.getId())
                .stream().map(AppOrderResponse::from).collect(java.util.stream.Collectors.toList());
    }

    // ════════════════════════════════════════════════════════════════
    // GET — Single order detail
    // ════════════════════════════════════════════════════════════════
    public AppOrderResponse getOrderById(Long orderId, String customerPhone) {
        AppOrder order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found."));
        if (!order.getCustomer().getPhone().equals(customerPhone)) {
            throw new RuntimeException("Access denied.");
        }
        return AppOrderResponse.from(order);
    }

    // ════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ════════════════════════════════════════════════════════════════
    private PaymentMethod parsePaymentMethod(String method) {
        if (method == null || method.isBlank()) {
            throw new RuntimeException("Payment method is required.");
        }
        try {
            return PaymentMethod.valueOf(
                    method.trim().toUpperCase().replace(" ", "_").replace("-", "_"));
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid payment method: " + method);
        }
    }

    private boolean verifySignature(String payload, String signature, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash     = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String computed = HexFormat.of().formatHex(hash);
            return computed.equalsIgnoreCase(signature);
        } catch (Exception e) {
            return false;
        }
    }
}