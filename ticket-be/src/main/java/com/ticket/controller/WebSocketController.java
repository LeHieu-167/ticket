package com.ticket.controller;

import com.ticket.dto.NotificationMessage;
import com.ticket.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
@Slf4j
public class WebSocketController {

    private final NotificationService notificationService;

    /**
     * Client gửi message tới /app/hello
     * Server broadcast tới /topic/messages
     */
    @MessageMapping("/hello")
    @SendTo("/topic/messages")
    public String greeting(String message) {
        log.info("📨 Nhận message: {}", message);
        return "Hello, " + message + "!";
    }

    /**
     * Client subscribe vào WebSocket
     * Log để tracking
     */
    @MessageMapping("/subscribe")
    public void handleSubscription(@Payload String userId, SimpMessageHeaderAccessor headerAccessor) {
        log.info("👋 User {} đã subscribe WebSocket", userId);
    }

    /**
     * Test endpoint - Admin broadcast message tới tất cả
     */
    @MessageMapping("/broadcast")
    public void broadcastMessage(@Payload NotificationMessage message, Principal principal) {
        log.info("📢 Broadcasting message từ {}: {}", principal.getName(), message.getTitle());
        notificationService.broadcastToAll(message);
    }
}

