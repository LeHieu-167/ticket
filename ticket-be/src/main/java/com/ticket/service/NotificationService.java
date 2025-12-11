package com.ticket.service;

import com.ticket.dto.NotificationMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Gửi notification tới một user cụ thể
     * @param userId ID của user
     * @param notification Thông báo cần gửi
     */
    public void sendToUser(Long userId, NotificationMessage notification) {
        try {
            String destination = "/queue/notifications";
            messagingTemplate.convertAndSendToUser(
                    userId.toString(), 
                    destination, 
                    notification
            );
            log.info("📤 Đã gửi notification tới user {} - Type: {}, Title: {}", 
                    userId, notification.getType(), notification.getTitle());
        } catch (Exception e) {
            log.error("❌ Lỗi gửi notification tới user {}: {}", userId, e.getMessage());
        }
    }

    /**
     * Broadcast notification tới tất cả users
     * @param notification Thông báo cần gửi
     */
    public void broadcastToAll(NotificationMessage notification) {
        try {
            messagingTemplate.convertAndSend("/topic/notifications", notification);
            log.info("📢 Đã broadcast notification - Type: {}, Title: {}", 
                    notification.getType(), notification.getTitle());
        } catch (Exception e) {
            log.error("❌ Lỗi broadcast notification: {}", e.getMessage());
        }
    }

    /**
     * Gửi notification về order đã được xử lý
     */
    public void notifyOrderProcessed(Long userId, Long orderId, String status, String message) {
        NotificationMessage notification = NotificationMessage.orderProcessed(orderId, status, message);
        sendToUser(userId, notification);
    }

    /**
     * Gửi notification về payment
     */
    public void notifyPaymentCompleted(Long userId, Long orderId, boolean success, String message) {
        NotificationMessage notification = NotificationMessage.paymentCompleted(orderId, success, message);
        sendToUser(userId, notification);
    }

    /**
     * Gửi notification về event mới
     */
    public void notifyNewEvent(Long eventId, String eventName) {
        NotificationMessage notification = NotificationMessage.eventUpdate(
                eventId,
                "Sự kiện mới",
                "Sự kiện mới: " + eventName + " vừa được thêm!"
        );
        broadcastToAll(notification);
    }

    /**
     * Gửi system message
     */
    public void sendSystemMessage(String title, String message, String severity) {
        NotificationMessage notification = NotificationMessage.systemMessage(title, message, severity);
        broadcastToAll(notification);
    }
}

