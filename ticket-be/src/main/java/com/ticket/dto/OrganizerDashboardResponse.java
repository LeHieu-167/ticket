package com.ticket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO chứa thống kê tổng quan cho Dashboard của Organizer
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrganizerDashboardResponse {

    /**
     * Tổng số sự kiện của Organizer
     */
    private long totalEvents;

    /**
     * Tổng số sự kiện đang hoạt động (ACTIVE)
     */
    private long activeEvents;

    /**
     * Tổng số sự kiện đang chờ duyệt
     */
    private long pendingEvents;

    /**
     * Tổng doanh thu từ tất cả sự kiện (chỉ tính đơn đã thanh toán)
     */
    private BigDecimal totalRevenue;

    /**
     * Tổng số vé đã bán
     */
    private long totalTicketsSold;

    /**
     * Tổng số vé đã check-in
     */
    private long totalTicketsCheckedIn;
}
