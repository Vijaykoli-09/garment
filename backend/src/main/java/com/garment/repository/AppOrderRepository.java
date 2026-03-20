package com.garment.repository;

import com.garment.entity.AppOrder;
import com.garment.entity.AppOrder.OrderStatus;
import com.garment.entity.AppOrder.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AppOrderRepository extends JpaRepository<AppOrder, Long> {

    // Customer's own orders — newest first
    List<AppOrder> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    // Customer's orders filtered by status
    List<AppOrder> findByCustomerIdAndOrderStatusOrderByCreatedAtDesc(Long customerId, OrderStatus status);

    // Admin: ALL orders — newest first
    List<AppOrder> findAllByOrderByCreatedAtDesc();

    // Admin: filter by order status
    List<AppOrder> findByOrderStatusOrderByCreatedAtDesc(OrderStatus status);

    // Admin: filter by payment status
    List<AppOrder> findByPaymentStatusOrderByCreatedAtDesc(PaymentStatus paymentStatus);

    // Find by Razorpay order ID (for payment verification)
    Optional<AppOrder> findByRazorpayOrderId(String razorpayOrderId);
}