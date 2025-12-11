package com.ticket.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventRequest {
    
    @NotBlank(message = "Tên sự kiện không được để trống")
    @Size(min = 3, max = 200, message = "Tên sự kiện phải từ 3-200 ký tự")
    private String name;

    @Size(max = 2000, message = "Mô tả không được vượt quá 2000 ký tự")
    private String description;

    @NotBlank(message = "Địa điểm không được để trống")
    private String location;

    @NotNull(message = "Ngày tổ chức không được để trống")
    @Future(message = "Ngày tổ chức phải là ngày trong tương lai")
    private LocalDateTime eventDate;

    @NotNull(message = "Giá vé không được để trống")
    @DecimalMin(value = "0.0", inclusive = false, message = "Giá vé phải lớn hơn 0")
    private BigDecimal ticketPrice;

    @NotNull(message = "Số lượng vé không được để trống")
    @Min(value = 1, message = "Số lượng vé phải ít nhất là 1")
    private Integer availableTickets;
}

