package com.garment.service;

import com.garment.DTO.AppOrderItemRequest;
import com.garment.DTO.AppOrderResponse;
import com.garment.DTO.AppRazorpayOrderRequest;
import com.garment.DTO.AppVerifyPaymentRequest;
import com.garment.DTO.AppVerifyCreditPaymentRequest;
import com.garment.DTO.SaleOrderDTO;
import com.garment.DTO.SaleOrderSaveDTO;
import com.garment.entity.CustomerRegistration;
import com.garment.entity.AppOrder;
import com.garment.entity.AppOrder.OrderStatus;
import com.garment.entity.AppOrder.PaymentMethod;
import com.garment.entity.AppOrder.PaymentStatus;
import com.garment.entity.AppOrderItem;
import com.garment.repository.CustomerRegistrationRepository;
import com.garment.repository.AppOrderRepository;
import com.garment.repository.ProductRepository;
import com.garment.repository.ShadeRepository;
import com.garment.util.AppSaleOrderMapper;
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
import java.util.Map;

@Service
public class AppOrderService {

    private final AppOrderRepository orderRepo;
    private final CustomerRegistrationRepository customerRepo;
    private final SaleOrderService saleOrderService;
    private final ProductRepository productRepo;
    private final ShadeRepository shadeRepo;

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    public AppOrderService(AppOrderRepository orderRepo,
                           CustomerRegistrationRepository customerRepo,
                           SaleOrderService saleOrderService,
                           ProductRepository productRepo,
                           ShadeRepository shadeRepo) {
        this.orderRepo        = orderRepo;
        this.customerRepo     = customerRepo;
        this.saleOrderService = saleOrderService;
        this.productRepo      = productRepo;
        this.shadeRepo        = shadeRepo;
    }

    // ════════════════════════════════════════════════════════════════
    // STEP 1 — Create Razorpay order + save pending Order in DB
    // ════════════════════════════════════════════════════════════════
    @Transactional
    public AppOrderResponse createRazorpayOrder(String customerPhone, AppRazorpayOrderRequest req) {

        CustomerRegistration customer = customerRepo.findByPhone(customerPhone)
                .orElseThrow(() -> new RuntimeException("Customer not found."));

        // ── VALIDATION: Check if customer has partyId ────────────────
        if (customer.getPartyId() == null) {
            throw new RuntimeException("Your account is pending approval. Please contact admin.");
        }

        double subtotal    = req.getItems().stream()
                .mapToDouble(AppOrderItemRequest::safeItemTotal)
                .sum();
        double gstAmount   = subtotal * 0.18;
        double totalAmount = subtotal + gstAmount;

        PaymentMethod method = parsePaymentMethod(req.getPaymentMethod());

        // ── Credit validation ─────────────────────────────────────────
        if (method == PaymentMethod.CREDIT_ORDER || method == PaymentMethod.ADVANCE_CREDIT) {
            if (!Boolean.TRUE.equals(customer.getCreditEnabled())) {
                throw new RuntimeException("Credit is not enabled for your account.");
            }
            double creditLimit  = customer.getCreditLimit() != null ? customer.getCreditLimit() : 0.0;
            double creditNeeded = (method == PaymentMethod.CREDIT_ORDER)
                    ? totalAmount
                    : totalAmount * 0.70;
            if (creditLimit <= 0) {
                throw new RuntimeException("No credit limit configured. Contact admin.");
            }
            if (creditNeeded > creditLimit) {
                throw new RuntimeException("Order ₹" + String.format("%.0f", creditNeeded) + " exceeds credit limit ₹" + String.format("%.0f", creditLimit));
            }
        }

        String  razorpayOrderId = null;
        boolean needsRazorpay   = (method != PaymentMethod.CREDIT_ORDER);

        if (needsRazorpay) {
            double razorpayAmount = (method == PaymentMethod.ADVANCE_CREDIT)
                    ? totalAmount * 0.30
                    : totalAmount;
            try {
                RazorpayClient client  = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
                JSONObject     options = new JSONObject();
                options.put("amount",          (long) Math.round(razorpayAmount * 100));
                options.put("currency",        "INR");
                options.put("receipt",         "rcpt_" + System.currentTimeMillis());
                options.put("payment_capture", 1);
                com.razorpay.Order rzpOrder = client.orders.create(options);
                razorpayOrderId = rzpOrder.get("id");
            } catch (RazorpayException e) {
                throw new RuntimeException("Failed to create Razorpay order: " + e.getMessage());
            }
        }

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

        for (AppOrderItemRequest itemReq : req.getItems()) {
            AppOrderItem item = new AppOrderItem();
            item.setOrder(order);
            item.setProductId(itemReq.getProductId());
            item.setProductName(itemReq.getProductName());
            item.setSelectedSize(itemReq.getSelectedSize());
            item.setQuantity(itemReq.getQuantity());
            item.setPricePerPc(itemReq.getPricePerPc());
            item.setItemTotal(itemReq.safeItemTotal());
            order.getItems().add(item);
        }

        AppOrder saved = orderRepo.save(order);

        // ════════════════════════════════════════════════════════════════
        // CREATE SALE ORDER IN WEB SYSTEM
        // ════════════════════════════════════════════════════════════════
        // Rule: Create immediately if CREDIT_ORDER (no payment needed upfront)
        if (method == PaymentMethod.CREDIT_ORDER) {
            createSaleOrderFromAppOrder(saved);
        }

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
    // STEP 2 — Verify Razorpay HMAC-SHA256 signature (original flow)
    // ════════════════════════════════════════════════════════════════
    @Transactional
    public AppOrderResponse verifyPayment(AppVerifyPaymentRequest req) {

        AppOrder order = orderRepo.findByRazorpayOrderId(req.getRazorpayOrderId())
                .orElseThrow(() -> new RuntimeException(
                        "Order not found for Razorpay ID: " + req.getRazorpayOrderId()));

        String  payload = req.getRazorpayOrderId() + "|" + req.getRazorpayPaymentId();
        boolean valid   = verifySignature(payload, req.getRazorpaySignature(), razorpayKeySecret);

        if (!valid) {
            order.setPaymentStatus(PaymentStatus.FAILED);
            orderRepo.save(order);
            throw new RuntimeException("Payment verification failed. Invalid signature.");
        }

        order.setRazorpayPaymentId(req.getRazorpayPaymentId());
        order.setRazorpaySignature(req.getRazorpaySignature());
        order.setPaymentStatus(PaymentStatus.PAID);
        order.setOrderStatus(OrderStatus.ACCEPTED);
        order.setPaidAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());

        AppOrder saved = orderRepo.save(order);

        // ════════════════════════════════════════════════════════════════
        // CREATE SALE ORDER IN WEB SYSTEM
        // ════════════════════════════════════════════════════════════════
        // Rules:
        // - UPI/CARD/etc (full payment) → create sale order NOW
        // - ADVANCE_CREDIT (30% paid) → create sale order NOW
        PaymentMethod method = saved.getPaymentMethod();
        if (method != PaymentMethod.CREDIT_ORDER) {
            createSaleOrderFromAppOrder(saved);
        }

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
    // CREDIT PAYMENT — Step 1
    // Customer pays their pending credit amount from Order History.
    // Creates a NEW Razorpay order for just the credit amount.
    // Returns: { orderId, razorpayOrderId, razorpayKeyId, creditAmount }
    // ════════════════════════════════════════════════════════════════
    @Transactional
    public Map<String, Object> createCreditPaymentOrder(Long orderId, String customerPhone) {

        AppOrder order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));

        // Security: ensure the order belongs to this customer
        if (!order.getCustomer().getPhone().equals(customerPhone)) {
            throw new RuntimeException("Access denied.");
        }

        // Guard: only allow on credit orders that are still unpaid
        boolean isCreditOrder = order.getPaymentMethod() == PaymentMethod.CREDIT_ORDER
                             || order.getPaymentMethod() == PaymentMethod.ADVANCE_CREDIT;
        if (!isCreditOrder) {
            throw new RuntimeException("This order is not a credit order.");
        }
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            throw new RuntimeException("This order is already fully paid.");
        }

        // The amount to charge: full total for CREDIT_ORDER, 70% for ADVANCE_CREDIT
        double creditAmount = order.getCreditAmount() != null && order.getCreditAmount() > 0
                ? order.getCreditAmount()
                : order.getTotalAmount();

        // Create a Razorpay order for the credit amount
        String creditRazorpayOrderId;
        try {
            RazorpayClient client  = new RazorpayClient(razorpayKeyId, razorpayKeySecret);
            JSONObject     options = new JSONObject();
            options.put("amount",          (long) Math.round(creditAmount * 100));
            options.put("currency",        "INR");
            options.put("receipt",         "credit_" + orderId + "_" + System.currentTimeMillis());
            options.put("payment_capture", 1);
            com.razorpay.Order rzpOrder = client.orders.create(options);
            creditRazorpayOrderId = rzpOrder.get("id");
        } catch (RazorpayException e) {
            throw new RuntimeException("Failed to create Razorpay order: " + e.getMessage());
        }

        // Store the credit Razorpay order ID on the order so we can verify it later
        order.setCreditRazorpayOrderId(creditRazorpayOrderId);
        order.setUpdatedAt(LocalDateTime.now());
        orderRepo.save(order);

        return Map.of(
                "orderId",         order.getId(),
                "razorpayOrderId", creditRazorpayOrderId,
                "razorpayKeyId",   razorpayKeyId,
                "creditAmount",    creditAmount
        );
    }

    // ════════════════════════════════════════════════════════════════
    // CREDIT PAYMENT — Step 2
    // Verifies the Razorpay signature for the credit payment,
    // marks order PAID, sets paidAt, returns the full updated order.
    // ════════════════════════════════════════════════════════════════
    @Transactional
    public Map<String, Object> verifyCreditPayment(AppVerifyCreditPaymentRequest req) {

        AppOrder order = orderRepo.findById(req.getOrderId())
                .orElseThrow(() -> new RuntimeException("Order not found: " + req.getOrderId()));

        // Validate the Razorpay order ID matches what we stored
        if (!req.getRazorpayOrderId().equals(order.getCreditRazorpayOrderId())) {
            throw new RuntimeException("Razorpay order ID mismatch.");
        }

        // Verify HMAC-SHA256 signature
        String  payload = req.getRazorpayOrderId() + "|" + req.getRazorpayPaymentId();
        boolean valid   = verifySignature(payload, req.getRazorpaySignature(), razorpayKeySecret);

        if (!valid) {
            throw new RuntimeException("Credit payment verification failed. Invalid signature.");
        }

        // Mark order fully paid and record the timestamp
        order.setPaymentStatus(PaymentStatus.PAID);
        order.setPaidAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());
        AppOrder saved = orderRepo.save(order);

        // Return the full updated order so the frontend can update the card in-place
        return Map.of("order", AppOrderResponse.from(saved));
    }

    // ════════════════════════════════════════════════════════════════
    // GET — Customer's own orders
    // ════════════════════════════════════════════════════════════════
    public List<AppOrderResponse> getMyOrders(String customerPhone) {
        CustomerRegistration customer = customerRepo.findByPhone(customerPhone)
                .orElseThrow(() -> new RuntimeException("Customer not found."));
        return orderRepo.findByCustomerIdOrderByCreatedAtDesc(customer.getId())
                .stream().map(AppOrderResponse::from)
                .collect(java.util.stream.Collectors.toList());
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
    // PRIVATE: Create Sale Order from App Order
    // ════════════════════════════════════════════════════════════════
    private void createSaleOrderFromAppOrder(AppOrder appOrder) {
        try {
            AppSaleOrderMapper mapper = new AppSaleOrderMapper(productRepo, shadeRepo);
            SaleOrderSaveDTO saleOrderDTO = mapper.convertToSaleOrder(appOrder);
            SaleOrderDTO created = saleOrderService.create(saleOrderDTO);
            
            System.out.println("✅ Sale Order created: " + created.getOrderNo() 
                    + " for App Order #" + appOrder.getId());
        } catch (Exception e) {
            // Log error but don't fail the app order
            System.err.println("❌ Failed to create Sale Order for App Order #" 
                    + appOrder.getId() + ": " + e.getMessage());
            e.printStackTrace();
            // Continue - app order is still valid even if sale order creation fails
        }
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