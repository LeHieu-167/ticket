package com.ticket.repository;

import com.ticket.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    // Lấy danh sách đơn hàng của một customer cụ thể
    List<Order> findByCustomerId(UUID customerId);

    // Lấy danh sách đơn hàng theo event
    List<Order> findByEventId(UUID eventId);

    // Lấy danh sách đơn hàng của customer với status cụ thể
    List<Order> findByCustomerIdAndStatus(UUID customerId, Order.OrderStatus status);

    // ==================== ORGANIZER STATISTICS ====================

    @org.springframework.data.jpa.repository.Query("SELECT SUM(o.totalPrice) FROM Order o, Event e WHERE o.eventId = e.id AND e.organizerId = :organizerId AND o.paymentStatus = 'PAID'")
    java.math.BigDecimal sumRevenueByOrganizerId(UUID organizerId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(DISTINCT o.customerId) FROM Order o, Event e WHERE o.eventId = e.id AND e.organizerId = :organizerId AND o.paymentStatus = 'PAID'")
    Long countCustomersByOrganizerId(UUID organizerId);

    @org.springframework.data.jpa.repository.Query("SELECT SUM(o.ticketQuantity) FROM Order o, Event e WHERE o.eventId = e.id AND e.organizerId = :organizerId AND o.paymentStatus = 'PAID'")
    Long countTicketsSoldByOrganizerId(UUID organizerId);

    /**
     * Đếm số vé đã bán cho một sự kiện cụ thể
     */
    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(o.ticketQuantity), 0) FROM Order o WHERE o.eventId = :eventId AND o.paymentStatus = 'PAID'")
    Long countTicketsSoldByEventId(UUID eventId);

    // ==================== BOOKING SESSION TIMEOUT ====================

    /**
     * Tìm các đơn hàng PENDING/CONFIRMED đã quá hạn expiredAt
     * Dùng cho job dọn dẹp đơn hết hạn
     */
    List<Order> findByStatusInAndExpiredAtBefore(List<Order.OrderStatus> statuses, java.time.LocalDateTime expiredAt);
    
    /**
     * Tìm đơn hàng CONFIRMED đã quá hạn (cần hoàn trả vé)
     */
    @org.springframework.data.jpa.repository.Query("SELECT o FROM Order o WHERE o.status = 'CONFIRMED' AND o.paymentStatus = 'PENDING' AND o.expiredAt < :now")
    List<Order> findExpiredConfirmedOrders(java.time.LocalDateTime now);

    /**
     * Tìm đơn hàng theo mã giao dịch thanh toán (VNPay TxnRef)
     */
    java.util.Optional<Order> findByPaymentTransactionId(String paymentTransactionId);
}

