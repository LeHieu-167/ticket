package com.ticket.dto;

import com.ticket.service.OrderQueueService;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response cho API đặt vé và check status
 * Hỗ trợ cơ chế Resumable Queue
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderStatusResponse {
    
    /**
     * Request ID do client tạo - dùng để track trạng thái
     */
    private String requestId;
    
    /**
     * Trạng thái của request: QUEUED, PROCESSING, SUCCESS, FAILED
     */
    private String status;
    
    /**
     * Thông báo cho người dùng
     */
    private String message;
    
    /**
     * Order ID nếu đã tạo thành công
     */
    private UUID orderId;

    /**
     * Có phải request mới không (false = request đã tồn tại)
     */
    private boolean isNewRequest;
    
    /**
     * Thời điểm hết hạn giữ vé (Booking Session Timeout)
     * Frontend sử dụng để hiển thị đồng hồ đếm ngược
     */
    private LocalDateTime expiredAt;

    // ==================== Factory Methods ====================

    /**
     * Response khi request mới được đưa vào hàng chờ
     */
    public static OrderStatusResponse queued(String requestId) {
        return OrderStatusResponse.builder()
                .requestId(requestId)
                .status("QUEUED")
                .message("Đơn hàng của bạn đã vào hàng chờ. Vui lòng đợi trong giây lát...")
                .isNewRequest(true)
                .build();
    }

    /**
     * Response khi request đã tồn tại (người dùng gửi lại sau khi reload)
     */
    public static OrderStatusResponse alreadyInQueue(String requestId, String currentStatus) {
        return OrderStatusResponse.builder()
                .requestId(requestId)
                .status(currentStatus)
                .message("Đơn hàng của bạn đang trong hàng chờ. Vui lòng tiếp tục đợi...")
                .isNewRequest(false)
                .build();
    }

    /**
     * Response khi đơn hàng đang được xử lý
     */
    public static OrderStatusResponse processing(String requestId) {
        return OrderStatusResponse.builder()
                .requestId(requestId)
                .status("PROCESSING")
                .message("Đơn hàng đang được xử lý...")
                .isNewRequest(false)
                .build();
    }

    /**
     * Response khi đơn hàng thành công
     */
    public static OrderStatusResponse success(String requestId, UUID orderId, String message) {
        return OrderStatusResponse.builder()
                .requestId(requestId)
                .status("SUCCESS")
                .message(message != null ? message : "Đặt vé thành công!")
                .orderId(orderId)
                .isNewRequest(false)
                .build();
    }

    /**
     * Response khi đơn hàng thất bại
     */
    public static OrderStatusResponse failed(String requestId, String reason) {
        return OrderStatusResponse.builder()
                .requestId(requestId)
                .status("FAILED")
                .message(reason != null ? reason : "Đặt vé thất bại. Vui lòng thử lại.")
                .isNewRequest(false)
                .build();
    }

    /**
     * Response khi không tìm thấy request (hết hạn hoặc không tồn tại)
     */
    public static OrderStatusResponse notFound(String requestId) {
        return OrderStatusResponse.builder()
                .requestId(requestId)
                .status("NOT_FOUND")
                .message("Không tìm thấy thông tin đơn hàng. Có thể đã hết hạn.")
                .isNewRequest(false)
                .build();
    }

    /**
     * Tạo response từ RequestQueueInfo
     */
    public static OrderStatusResponse fromQueueInfo(OrderQueueService.RequestQueueInfo info) {
        if (info == null) {
            return null;
        }

        return OrderStatusResponse.builder()
                .requestId(info.requestId())
                .status(info.status().name())
                .message(info.message())
                .orderId(info.orderId())
                .expiredAt(info.expiredAt())
                .isNewRequest(false)
                .build();
    }

    // ==================== Legacy Methods (backward compatibility) ====================

    /**
     * @deprecated Use queued(requestId) instead
     */
    @Deprecated
    public static OrderStatusResponse pending() {
        return OrderStatusResponse.builder()
                .status("PENDING")
                .message("Đơn hàng của bạn đang được xử lý. Vui lòng chờ trong giây lát.")
                .build();
    }
}

