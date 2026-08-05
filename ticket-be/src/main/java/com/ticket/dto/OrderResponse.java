package com.ticket.dto;

import com.ticket.entity.Order;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {
    private UUID id;
    private UUID customerId;
    private UUID eventId;
    private Integer ticketQuantity;
    private BigDecimal totalPrice;
    private String status;
    private String paymentStatus;
    private String paymentMethod;
    private String paymentTransactionId;
    private LocalDateTime paymentTime;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    /**
     * Thời điểm hết hạn giữ vé (Booking Session Timeout)
     * Frontend sử dụng trường này để hiển thị đồng hồ đếm ngược
     */
    private LocalDateTime expiredAt;

    public static OrderResponse fromEntity(Order order) {
        OrderResponse response = new OrderResponse();
        response.setId(order.getId());
        response.setCustomerId(order.getCustomerId());
        response.setEventId(order.getEventId());
        response.setTicketQuantity(order.getTicketQuantity());
        response.setTotalPrice(order.getTotalPrice());
        response.setStatus(order.getStatus().name());
        response.setPaymentStatus(order.getPaymentStatus() != null ? order.getPaymentStatus().name() : null);
        response.setPaymentMethod(order.getPaymentMethod());
        response.setPaymentTransactionId(order.getPaymentTransactionId());
        response.setPaymentTime(order.getPaymentTime());
        response.setCreatedAt(order.getCreatedAt());
        response.setUpdatedAt(order.getUpdatedAt());
        response.setExpiredAt(order.getExpiredAt());
        return response;
    }
}
