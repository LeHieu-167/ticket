package com.ticket.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketTypeRequest {

    @NotNull(message = "ID sự kiện không được để trống")
    private UUID eventId;

    @NotBlank(message = "Tên loại vé không được để trống")
    private String name;

    private String description;

    @NotNull(message = "Giá vé không được để trống")
    @Min(value = 0, message = "Giá vé phải >= 0")
    private BigDecimal price;

    @NotNull(message = "Số lượng vé không được để trống")
    @Min(value = 1, message = "Số lượng vé phải ít nhất là 1")
    private Integer totalQuantity;

    private String seatingType;

    @NotBlank(message = "Tên khu vực không được để trống")
    private String zoneName;

    private String zoneDescription;
    private String rowLabels;
    private Integer seatsPerRow;
    private Boolean allowSeatSelection;
    private String colorCode;
    private Integer displayOrder;
}
