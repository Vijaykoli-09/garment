package com.garment.repository;

import com.garment.entity.AppOrder;
import com.garment.entity.AppOrder.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AppOrderRepository extends JpaRepository<AppOrder, Long> {

    // Customer's own orders — newest first
    List<AppOrder> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    // Filter by order status
    List<AppOrder> findByCustomerIdAndOrderStatusOrderByCreatedAtDesc(Long customerId, OrderStatus status);

    // Admin: all orders by status
    List<AppOrder> findByOrderStatusOrderByCreatedAtDesc(OrderStatus status);

    // Find by Razorpay order ID (for payment verification)
    java.util.Optional<AppOrder> findByRazorpayOrderId(String razorpayOrderId);
}