package com.ticket.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationMessage {
    private String type; // ORDER, PAYMENT, EVENT, SYSTEM
    private String title;
    private String message;
    private Object data; // Additional data (orderId, eventId, etc.)
    private LocalDateTime timestamp;
    private String severity; // INFO, SUCCESS, WARNING, ERROR

    public static NotificationMessage orderProcessed(UUID orderId, String status, String message) {
        NotificationMessage notification = new NotificationMessage();
        notification.setType("ORDER");
        notification.setTitle("Cập nhật đơn hàng");
        notification.setMessage(message);
        notification.setData(orderId);
        notification.setTimestamp(LocalDateTime.now());
        notification.setSeverity("CONFIRMED".equals(status) ? "SUCCESS" : "ERROR");
        return notification;
    }

    public static NotificationMessage paymentCompleted(UUID orderId, boolean success, String message) {
        NotificationMessage notification = new NotificationMessage();
        notification.setType("PAYMENT");
        notification.setTitle(success ? "Thanh toán thành công" : "Thanh toán thất bại");
        notification.setMessage(message);
        notification.setData(orderId);
        notification.setTimestamp(LocalDateTime.now());
        notification.setSeverity(success ? "SUCCESS" : "ERROR");
        return notification;
    }

    public static NotificationMessage eventUpdate(UUID eventId, String title, String message) {
        NotificationMessage notification = new NotificationMessage();
        notification.setType("EVENT");
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setData(eventId);
        notification.setTimestamp(LocalDateTime.now());
        notification.setSeverity("INFO");
        return notification;
    }

    public static NotificationMessage systemMessage(String title, String message, String severity) {
        NotificationMessage notification = new NotificationMessage();
        notification.setType("SYSTEM");
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setTimestamp(LocalDateTime.now());
        notification.setSeverity(severity);
        return notification;
    }
}

