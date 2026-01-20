package com.ticket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO chứa thông tin đơn hàng cùng với danh sách vé
 * Dùng cho organizer quản lý đơn hàng
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderWithTicketsResponse {
    
    private String orderId;
    private String eventId;
    private String eventName;
    private String eventDate;
    private String eventLocation;
    private double totalPrice;
    private String status;
    private String paymentStatus;
    private String createdAt;
    
    private BuyerInfo buyerInfo;
    private List<TicketResponse> tickets;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BuyerInfo {
        private String name;
        private String email;
        private String phone;
    }
}
