package com.ticket.service;

import com.ticket.dto.NotificationMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public void sendToUser(UUID userId, NotificationMessage notification) {
        try {
            String destination = "/queue/notifications";
            messagingTemplate.convertAndSendToUser(
                    userId.toString(), 
                    destination, 
                    notification
            );
            log.info("Đã gửi notification tới user {} - Type: {}", userId, notification.getType());
        } catch (Exception e) {
            log.error("Lỗi gửi notification tới user {}: {}", userId, e.getMessage());
        }
    }

    public void broadcastToAll(NotificationMessage notification) {
        try {
            messagingTemplate.convertAndSend("/topic/notifications", notification);
            log.info("Đã broadcast notification - Type: {}", notification.getType());
        } catch (Exception e) {
            log.error("Lỗi broadcast notification: {}", e.getMessage());
        }
    }

    public void notifyOrderProcessed(UUID userId, UUID orderId, String status, String message) {
        NotificationMessage notification = NotificationMessage.orderProcessed(orderId, status, message);
        sendToUser(userId, notification);
    }

    public void notifyPaymentCompleted(UUID userId, UUID orderId, boolean success, String message) {
        NotificationMessage notification = NotificationMessage.paymentCompleted(orderId, success, message);
        sendToUser(userId, notification);
    }

    public void notifyNewEvent(UUID eventId, String eventName) {
        NotificationMessage notification = NotificationMessage.eventUpdate(eventId, "Sự kiện mới", "Sự kiện mới: " + eventName + " vừa được thêm!");
        broadcastToAll(notification);
    }

    public void sendSystemMessage(String title, String message, String severity) {
        NotificationMessage notification = NotificationMessage.systemMessage(title, message, severity);
        broadcastToAll(notification);
    }
}
