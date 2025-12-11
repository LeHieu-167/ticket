package com.ticket.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "ticket_quantity", nullable = false)
    private Integer ticketQuantity;

    @Column(name = "total_price", nullable = false)
    private BigDecimal totalPrice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    // Payment fields
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status")
    private PaymentStatus paymentStatus;

    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(name = "payment_transaction_id")
    private String paymentTransactionId;

    @Column(name = "payment_time")
    private LocalDateTime paymentTime;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = OrderStatus.PENDING;
        }
        if (paymentStatus == null) {
            paymentStatus = PaymentStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum OrderStatus {
        PENDING,      // Đang chờ xử lý
        PROCESSING,   // Đang xử lý
        CONFIRMED,    // Đã xác nhận (có vé nhưng chưa thanh toán)
        FAILED        // Thất bại (hết vé hoặc lỗi)
    }

    public enum PaymentStatus {
        PENDING,      // Chờ thanh toán
        PAID,         // Đã thanh toán
        FAILED,       // Thanh toán thất bại
        REFUNDED      // Đã hoàn tiền
    }
}

