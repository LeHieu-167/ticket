package com.ticket.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable simple broker với prefix "/topic" cho broadcast
        // và "/queue" cho user-specific messages
        config.enableSimpleBroker("/topic", "/queue");
        
        // Prefix cho messages từ client tới server
        config.setApplicationDestinationPrefixes("/app");
        
        // Prefix cho user-specific messages
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Đăng ký endpoint WebSocket
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // Cho phép tất cả origins (chỉ dùng trong dev)
                .withSockJS(); // Fallback nếu WebSocket không available
    }
}

