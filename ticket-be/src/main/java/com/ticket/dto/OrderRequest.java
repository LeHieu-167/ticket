package com.ticket.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderRequest implements Serializable {
    
    @NotNull(message = "ID sự kiện không được để trống")
    private Long eventId;

    @NotNull(message = "Số lượng vé không được để trống")
    @Min(value = 1, message = "Số lượng vé phải ít nhất là 1")
    private Integer ticketQuantity;

    // customerId sẽ được lấy từ JWT token, không cần client gửi
    private Long customerId; // Will be set by the system from JWT token
}

