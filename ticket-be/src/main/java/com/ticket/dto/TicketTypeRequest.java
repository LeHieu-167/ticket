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

import java.util.UUID;

/**
 * DTO cho yêu cầu tạo/cập nhật loại vé
 * 
 * Hỗ trợ 3 loại chỗ ngồi (seatingType):
 * - ZONE_ONLY: Chỉ có khu vực (sự kiện ngoài trời, đứng)
 * - ZONE_WITH_ROW: Có khu vực và hàng (ghế dài không đánh số)
 * - FULL_SEAT: Có đầy đủ khu vực, hàng, số ghế (concert trong nhà)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketTypeRequest {

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

    /**
     * Tên khu vực
     * Ví dụ: "VIP Zone", "General Admission", "Khu A", "Sân khấu chính"
     */
    private String zoneName;

    private String zoneDescription;
    private String rowLabels;
    private Integer seatsPerRow;
    private Boolean allowSeatSelection;
    private String colorCode;
    private Integer displayOrder;
}
