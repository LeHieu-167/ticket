package com.ticket.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;
import java.util.UUID;

/**
 * DTO cho yêu cầu đặt vé
 * Hỗ trợ cơ chế Resumable Queue với requestId
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderRequest implements Serializable {
    
    /**
     * Request ID duy nhất do client tạo ra (UUID)
     * Dùng cho cơ chế Resumable Queue - giúp người dùng giữ vị trí khi reload trang
     * Cũng đảm bảo Idempotency - tránh duplicate request
     */
    @NotBlank(message = "Request ID không được để trống")
    private String requestId;
    
    @NotNull(message = "ID sự kiện không được để trống")
    private UUID eventId;
    private UUID eventId;

    @NotNull(message = "Số lượng vé không được để trống")
    @Min(value = 1, message = "Số lượng vé phải ít nhất là 1")
    private Integer ticketQuantity;

    // customerId sẽ được lấy từ JWT token, không cần client gửi
    private UUID customerId; // Will be set by the system from JWT token
}
