package com.ticket.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Service quản lý trạng thái hàng chờ đặt vé trong Redis
 * 
 * Cơ chế Resumable Queue:
 * - Mỗi request đặt vé có một requestId duy nhất (UUID)
 * - Trạng thái được lưu trong Redis với TTL 30 phút
 * - Người dùng có thể reload trang mà vẫn giữ được vị trí trong hàng chờ
 * - Chặn duplicate request (Idempotency)
 * 
 * Các trạng thái:
 * - QUEUED: Đã vào hàng chờ Kafka, chưa được consumer xử lý
 * - PROCESSING: Consumer đang xử lý (đang giữ lock, kiểm tra tồn kho...)
 * - SUCCESS: Đặt vé thành công, đã có Order ID
 * - FAILED: Đặt vé thất bại (hết vé, lỗi hệ thống...)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderQueueService {

    private final RedisTemplate<String, String> redisTemplate;

    // Prefix cho key Redis
    private static final String REQUEST_STATUS_PREFIX = "order_request:";
    private static final String REQUEST_ORDER_PREFIX = "order_request_order:";
    private static final String REQUEST_MESSAGE_PREFIX = "order_request_message:";
    private static final String REQUEST_EXPIRED_PREFIX = "order_request_expired:";
    
    // TTL cho các key (30 phút)
    private static final long REQUEST_TTL_MINUTES = 30;
    
    // Booking Session Timeout: 15 phút để thanh toán
    public static final long BOOKING_SESSION_TIMEOUT_MINUTES = 15;

    /**
     * Các trạng thái của request trong hàng chờ
     */
    public enum QueueStatus {
        QUEUED,      // Đã vào hàng chờ, chưa xử lý
        PROCESSING,  // Đang xử lý
        SUCCESS,     // Thành công
        FAILED       // Thất bại
    }

    /**
     * Kiểm tra xem requestId đã tồn tại trong hàng chờ chưa
     * @param requestId UUID của request
     * @return true nếu đã tồn tại
     */
    public boolean isRequestExists(String requestId) {
        String key = REQUEST_STATUS_PREFIX + requestId;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }

    /**
     * Lấy trạng thái hiện tại của request
     * @param requestId UUID của request
     * @return Trạng thái hoặc null nếu không tồn tại
     */
    public QueueStatus getRequestStatus(String requestId) {
        String key = REQUEST_STATUS_PREFIX + requestId;
        String status = redisTemplate.opsForValue().get(key);
        
        if (status == null) {
            return null;
        }
        
        try {
            return QueueStatus.valueOf(status);
        } catch (IllegalArgumentException e) {
            log.warn("Trạng thái không hợp lệ trong Redis: {} cho requestId: {}", status, requestId);
            return null;
        }
    }

    /**
     * Lấy Order ID đã được tạo cho request (nếu có)
     * @param requestId UUID của request
     * @return Order ID hoặc null
     */
    public UUID getOrderId(String requestId) {
        String key = REQUEST_ORDER_PREFIX + requestId;
        String orderId = redisTemplate.opsForValue().get(key);
        
        if (orderId == null) {
            return null;
        }
        
        try {
            return UUID.fromString(orderId);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * Lấy message/lý do cho request
     * @param requestId UUID của request
     * @return Message hoặc null
     */
    public String getMessage(String requestId) {
        String key = REQUEST_MESSAGE_PREFIX + requestId;
        return redisTemplate.opsForValue().get(key);
    }

    /**
     * Lấy thời gian hết hạn giữ vé
     * @param requestId UUID của request
     * @return LocalDateTime hoặc null
     */
    public LocalDateTime getExpiredAt(String requestId) {
        String key = REQUEST_EXPIRED_PREFIX + requestId;
        String expiredStr = redisTemplate.opsForValue().get(key);
        
        if (expiredStr == null) {
            return null;
        }
        
        try {
            return LocalDateTime.parse(expiredStr);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Đánh dấu request đã vào hàng chờ (QUEUED)
     * Gọi khi nhận được request từ client, trước khi gửi vào Kafka
     * 
     * @param requestId UUID của request
     * @return true nếu đánh dấu thành công (request mới), false nếu đã tồn tại
     */
    public boolean markAsQueued(String requestId) {
        String key = REQUEST_STATUS_PREFIX + requestId;
        
        // setIfAbsent = SETNX trong Redis - chỉ set nếu key chưa tồn tại
        Boolean success = redisTemplate.opsForValue().setIfAbsent(
                key, 
                QueueStatus.QUEUED.name(), 
                REQUEST_TTL_MINUTES, 
                TimeUnit.MINUTES
        );
        
        if (Boolean.TRUE.equals(success)) {
            log.info("Request {} đã được đánh dấu QUEUED", requestId);
            return true;
        } else {
            log.info("Request {} đã tồn tại trong hàng chờ", requestId);
            return false;
        }
    }

    /**
     * Đánh dấu request đang được xử lý (PROCESSING)
     * Gọi khi Consumer bắt đầu xử lý message từ Kafka
     * 
     * @param requestId UUID của request
     */
    public void markAsProcessing(String requestId) {
        String key = REQUEST_STATUS_PREFIX + requestId;
        redisTemplate.opsForValue().set(key, QueueStatus.PROCESSING.name(), REQUEST_TTL_MINUTES, TimeUnit.MINUTES);
        log.info("Request {} đang được xử lý (PROCESSING)", requestId);
    }

    /**
     * Đánh dấu request thành công (SUCCESS)
     * Gọi khi đã tạo Order thành công
     * 
     * @param requestId UUID của request
     * @param orderId ID của Order đã tạo
     * @param message Thông báo cho người dùng
     */
    public void markAsSuccess(String requestId, UUID orderId, String message) {
        markAsSuccess(requestId, orderId, message, null);
    }
    
    /**
     * Đánh dấu request thành công (SUCCESS) với thời gian hết hạn
     * Gọi khi đã tạo Order thành công
     * 
     * @param requestId UUID của request
     * @param orderId ID của Order đã tạo
     * @param message Thông báo cho người dùng
     * @param expiredAt Thời gian hết hạn giữ vé
     */
    public void markAsSuccess(String requestId, UUID orderId, String message, LocalDateTime expiredAt) {
        String statusKey = REQUEST_STATUS_PREFIX + requestId;
        String orderKey = REQUEST_ORDER_PREFIX + requestId;
        String messageKey = REQUEST_MESSAGE_PREFIX + requestId;
        String expiredKey = REQUEST_EXPIRED_PREFIX + requestId;
        
        redisTemplate.opsForValue().set(statusKey, QueueStatus.SUCCESS.name(), REQUEST_TTL_MINUTES, TimeUnit.MINUTES);
        redisTemplate.opsForValue().set(orderKey, orderId.toString(), REQUEST_TTL_MINUTES, TimeUnit.MINUTES);

        if (message != null) {
            redisTemplate.opsForValue().set(messageKey, message, REQUEST_TTL_MINUTES, TimeUnit.MINUTES);
        }
        
        if (expiredAt != null) {
            redisTemplate.opsForValue().set(expiredKey, expiredAt.toString(), REQUEST_TTL_MINUTES, TimeUnit.MINUTES);
        }
        
        log.info("Request {} thành công - Order ID: {}, Hết hạn: {}", requestId, orderId, expiredAt);
    }

    /**
     * Đánh dấu request thất bại (FAILED)
     * Gọi khi không thể tạo Order (hết vé, lỗi...)
     * 
     * @param requestId UUID của request
     * @param reason Lý do thất bại
     */
    public void markAsFailed(String requestId, String reason) {
        String statusKey = REQUEST_STATUS_PREFIX + requestId;
        String messageKey = REQUEST_MESSAGE_PREFIX + requestId;
        
        redisTemplate.opsForValue().set(statusKey, QueueStatus.FAILED.name(), REQUEST_TTL_MINUTES, TimeUnit.MINUTES);
        
        if (reason != null) {
            redisTemplate.opsForValue().set(messageKey, reason, REQUEST_TTL_MINUTES, TimeUnit.MINUTES);
        }
        
        log.info("Request {} thất bại - Lý do: {}", requestId, reason);
    }

    /**
     * Xóa request khỏi hàng chờ
     * Gọi khi người dùng hủy hoặc sau khi đã xử lý xong
     * 
     * @param requestId UUID của request
     */
    public void removeRequest(String requestId) {
        String statusKey = REQUEST_STATUS_PREFIX + requestId;
        String orderKey = REQUEST_ORDER_PREFIX + requestId;
        String messageKey = REQUEST_MESSAGE_PREFIX + requestId;
        String expiredKey = REQUEST_EXPIRED_PREFIX + requestId;
        
        redisTemplate.delete(statusKey);
        redisTemplate.delete(orderKey);
        redisTemplate.delete(messageKey);
        redisTemplate.delete(expiredKey);
        
        log.info("Đã xóa request {} khỏi hàng chờ", requestId);
    }

    /**
     * Lấy thông tin đầy đủ của request
     * @param requestId UUID của request
     * @return RequestQueueInfo chứa toàn bộ thông tin
     */
    public RequestQueueInfo getRequestInfo(String requestId) {
        QueueStatus status = getRequestStatus(requestId);
        
        if (status == null) {
            return null;
        }
        
        return new RequestQueueInfo(
                requestId,
                status,
                getOrderId(requestId),
                getMessage(requestId),
                getExpiredAt(requestId)
        );
    }

    /**
     * DTO chứa thông tin request trong hàng chờ
     */
    public record RequestQueueInfo(
            String requestId,
            QueueStatus status,
            UUID orderId,
            String message,
            LocalDateTime expiredAt
    ) {}
}

