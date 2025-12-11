package com.ticket.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO cho yêu cầu tạo vé
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketRequest {

    @NotNull(message = "ID sự kiện không được để trống")
    private Long eventId;

    @NotNull(message = "ID loại vé không được để trống")
    private Long ticketTypeId;

    @NotNull(message = "Số lượng vé không được để trống")
    @Min(value = 1, message = "Số lượng vé phải ít nhất là 1")
    private Integer quantity;

    // Thông tin ghế (tùy chọn, nếu loại vé có ghế cụ thể)
    private String zone;
    private String rowName;
    private String seatNumber;

    // Thông tin người sở hữu vé (tùy chọn)
    private String holderName;
    private String holderEmail;
    private String holderPhone;
}

