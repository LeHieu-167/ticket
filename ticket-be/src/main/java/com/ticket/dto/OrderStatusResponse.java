package com.ticket.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderStatusResponse {
    private String message;
    private String status;
    
    public static OrderStatusResponse pending() {
        return new OrderStatusResponse(
            "Đơn hàng của bạn đang được xử lý. Vui lòng chờ trong giây lát.",
            "PENDING"
        );
    }
    
    public static OrderStatusResponse processing() {
        return new OrderStatusResponse(
            "Đơn hàng đang được xử lý...",
            "PROCESSING"
        );
    }
}

