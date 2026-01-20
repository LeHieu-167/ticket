package com.ticket.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO cho request check-in vé
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CheckInRequest {

    /**
     * Mã vé cần check-in (ticket code từ QR)
     */
    @NotBlank(message = "Mã vé không được để trống")
    private String ticketCode;
}

