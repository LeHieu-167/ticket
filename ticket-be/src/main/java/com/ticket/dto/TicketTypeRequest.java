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

    // ==================== SEATING CONFIGURATION ====================

    /**
     * Loại chỗ ngồi: ZONE_ONLY, ZONE_WITH_ROW, FULL_SEAT
     * Mặc định: ZONE_ONLY
     */
    private String seatingType;

    /**
     * Tên khu vực
     * Ví dụ: "VIP Zone", "General Admission", "Khu A", "Sân khấu chính"
     */
    private String zoneName;

    /**
     * Mô tả khu vực (tùy chọn)
     * Ví dụ: "Gần sân khấu, có ghế ngồi", "Khu vực đứng tự do"
     */
    private String zoneDescription;

    /**
     * Danh sách hàng (chỉ dùng khi seatingType = ZONE_WITH_ROW hoặc FULL_SEAT)
     * Format: comma-separated "A,B,C,D,E" hoặc "1,2,3,4,5"
     */
    private String rowLabels;

    /**
     * Số ghế mỗi hàng (chỉ dùng khi seatingType = FULL_SEAT)
     */
    private Integer seatsPerRow;

    /**
     * Cho phép người dùng chọn ghế hay hệ thống tự động gán
     * true = user chọn ghế trên sơ đồ
     * false = hệ thống tự động gán ghế theo thứ tự
     */
    private Boolean allowSeatSelection;

    // ==================== DISPLAY CONFIGURATION ====================

    /**
     * Màu hiển thị trên UI
     */
    private String colorCode;

    /**
     * Thứ tự hiển thị trong danh sách
     */
    private Integer displayOrder;
}

