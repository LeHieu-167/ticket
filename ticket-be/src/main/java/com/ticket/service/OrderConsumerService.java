package com.ticket.service;

import com.ticket.dto.OrderRequest;
import com.ticket.entity.Event;
import com.ticket.entity.Order;
import com.ticket.repository.EventRepository;
import com.ticket.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Consumer xử lý các yêu cầu đặt vé từ Kafka
 * 
 * Tích hợp Resumable Queue:
 * - Kiểm tra trạng thái Redis trước khi xử lý (skip nếu đã bị hủy)
 * - Cập nhật trạng thái PROCESSING/SUCCESS/FAILED vào Redis
 * - Client có thể reload trang và vẫn biết được trạng thái đơn hàng
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderConsumerService {

    private final EventRepository eventRepository;
    private final OrderRepository orderRepository;
    private final RedissonClient redissonClient;
    private final NotificationService notificationService;
    private final OrderQueueService orderQueueService;

    private static final long LOCK_WAIT_TIME = 10L;
    private static final long LOCK_LEASE_TIME = 30L;
    // Booking Session Timeout: 15 phút để thanh toán
    private static final long BOOKING_TIMEOUT_MINUTES = OrderQueueService.BOOKING_SESSION_TIMEOUT_MINUTES;

    /**
     * Consumer lắng nghe Kafka topic "order_requests"
     * Xử lý các yêu cầu đặt vé một cách bất đồng bộ
     * 
     * Resumable Queue Flow:
     * 1. Kiểm tra trạng thái trong Redis (nếu đã bị hủy thì skip)
     * 2. Đánh dấu PROCESSING
     * 3. Xử lý đơn hàng
     * 4. Đánh dấu SUCCESS hoặc FAILED
     */
    @KafkaListener(
            topics = "${kafka.topic.order-requests}",
            groupId = "${spring.kafka.consumer.group-id}",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void consumeOrderRequest(OrderRequest orderRequest) {
        String requestId = orderRequest.getRequestId();
        
        log.info("Nhận được yêu cầu đặt vé từ Kafka - RequestID: {}, Customer: {}, Event: {}, Quantity: {}",
                requestId, orderRequest.getCustomerId(), orderRequest.getEventId(), orderRequest.getTicketQuantity());

        // ==================== RESUMABLE QUEUE: Kiểm tra trạng thái ====================
        OrderQueueService.QueueStatus currentStatus = orderQueueService.getRequestStatus(requestId);
        
        if (currentStatus == null) {
            // Request đã bị xóa khỏi Redis (hủy hoặc hết hạn) -> Skip
            log.warn("Request {} không tồn tại trong Redis (đã hủy hoặc hết hạn). Bỏ qua.", requestId);
            return;
        }
        
        if (currentStatus == OrderQueueService.QueueStatus.SUCCESS || 
            currentStatus == OrderQueueService.QueueStatus.FAILED) {
            // Request đã được xử lý trước đó (có thể do retry) -> Skip
            log.warn("Request {} đã được xử lý với status: {}. Bỏ qua.", requestId, currentStatus);
            return;
        }

        // ==================== RESUMABLE QUEUE: Đánh dấu PROCESSING ====================
        orderQueueService.markAsProcessing(requestId);

        String lockKey = "event:lock:" + orderRequest.getEventId().toString();
        RLock lock = redissonClient.getLock(lockKey);

        try {
            boolean isLocked = lock.tryLock(LOCK_WAIT_TIME, LOCK_LEASE_TIME, TimeUnit.SECONDS);

            if (isLocked) {
                log.info("Đã giữ lock cho Event ID: {}", orderRequest.getEventId());
                log.info("Đã giữ lock cho Event ID: {}", orderRequest.getEventId());
                try {
                    processOrder(orderRequest);
                } finally {
                    lock.unlock();
                    log.info("Đã nhả lock cho Event ID: {}", orderRequest.getEventId());
                    log.info("Đã nhả lock cho Event ID: {}", orderRequest.getEventId());
                }
            } else {
                log.warn("Không thể lấy lock cho Event ID: {} sau {} giây. Yêu cầu sẽ được retry.",
                        orderRequest.getEventId(), LOCK_WAIT_TIME);
                
                // Tạo đơn hàng với status PENDING (chưa xử lý)
                createPendingOrder(orderRequest, "Không thể lấy lock - Đang chờ xử lý");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Thread bị interrupt khi chờ lock cho Event ID: {}", orderRequest.getEventId());
            log.error("Thread bị interrupt khi chờ lock cho Event ID: {}", orderRequest.getEventId());
            createFailedOrder(orderRequest, "Lỗi hệ thống: Thread interrupted");
        } catch (Exception e) {
            log.error("Lỗi không mong đợi khi xử lý đơn hàng: {}", e.getMessage(), e);
            log.error("Lỗi không mong đợi khi xử lý đơn hàng: {}", e.getMessage(), e);
            createFailedOrder(orderRequest, "Lỗi hệ thống: " + e.getMessage());
        }
    }

    /**
     * Xử lý đơn hàng: Kiểm tra tồn kho, trừ kho, tạo order
     * Logic quan trọng: Phải chạy trong transaction để đảm bảo tính nhất quán
     * 
     * Resumable Queue: Cập nhật trạng thái SUCCESS vào Redis khi hoàn thành
     */
    @Transactional
    protected void processOrder(OrderRequest orderRequest) {
        String requestId = orderRequest.getRequestId();
        UUID eventId = orderRequest.getEventId();
        UUID customerId = orderRequest.getCustomerId();
        Integer requestedQuantity = orderRequest.getTicketQuantity();

        log.info("Bắt đầu xử lý đơn hàng - RequestID: {}, Event: {}, Customer: {}, Quantity: {}",
                requestId, eventId, customerId, requestedQuantity);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Sự kiện không tồn tại với ID: " + eventId));

        if (!event.isActive()) {
            log.warn("Sự kiện ID: {} không còn hoạt động", eventId);
            log.warn("Sự kiện ID: {} không còn hoạt động", eventId);
            createFailedOrder(orderRequest, "Sự kiện không còn hoạt động");
            return;
        }

        Integer availableTickets = event.getAvailableTickets();
        log.info("Số vé hiện tại: {}, Số vé yêu cầu: {}", availableTickets, requestedQuantity);
        log.info("Số vé hiện tại: {}, Số vé yêu cầu: {}", availableTickets, requestedQuantity);

        if (availableTickets < requestedQuantity) {
            log.warn("Không đủ vé - Còn: {}, Yêu cầu: {}", availableTickets, requestedQuantity);
            log.warn("Không đủ vé - Còn: {}, Yêu cầu: {}", availableTickets, requestedQuantity);
            createFailedOrder(orderRequest, "Không đủ vé. Chỉ còn " + availableTickets + " vé.");
            return;
        }

        Integer newAvailableTickets = availableTickets - requestedQuantity;
        event.setAvailableTickets(newAvailableTickets);
        eventRepository.save(event);

        log.info("Đã trừ tồn kho - Còn lại: {} vé", newAvailableTickets);
        log.info("Đã trừ tồn kho - Còn lại: {} vé", newAvailableTickets);

        // 5. Tạo đơn hàng thành công với Booking Session Timeout
        BigDecimal totalPrice = event.getTicketPrice().multiply(BigDecimal.valueOf(requestedQuantity));
        
        // Thiết lập thời gian hết hạn giữ vé: NOW + 15 phút
        LocalDateTime expiredAt = LocalDateTime.now().plusMinutes(BOOKING_TIMEOUT_MINUTES);

        Order order = new Order();
        order.setCustomerId(customerId);
        order.setEventId(eventId);
        order.setTicketQuantity(requestedQuantity);
        order.setTotalPrice(totalPrice);
        order.setStatus(Order.OrderStatus.CONFIRMED);
        order.setExpiredAt(expiredAt); // Set thời gian hết hạn

        orderRepository.save(order);

        log.info("Đơn hàng đã được xác nhận - Order ID: {}, Total: {} VND, Hết hạn: {}",
                order.getId(), totalPrice, expiredAt);

        // 6. RESUMABLE QUEUE: Đánh dấu SUCCESS trong Redis với expiredAt
        String successMessage = String.format(
                "Đơn hàng #%s đã được xác nhận! Bạn đã đặt %d vé. Tổng tiền: %,d VND. Vui lòng thanh toán trong %d phút.",
                order.getId(), requestedQuantity, totalPrice.longValue(), BOOKING_TIMEOUT_MINUTES
        );
        orderQueueService.markAsSuccess(requestId, order.getId(), successMessage, expiredAt);

        // 7. Gửi WebSocket notification cho customer
        try {
            notificationService.notifyOrderProcessed(customerId, order.getId(), "CONFIRMED", successMessage);
        } catch (Exception e) {
            log.error("Lỗi gửi notification: {}", e.getMessage());
            log.error("Lỗi gửi notification: {}", e.getMessage());
        }
    }

    /**
     * Tạo đơn hàng với trạng thái PENDING
     * Lưu ý: Không cập nhật Redis vì đây là trạng thái tạm thời, request vẫn đang trong queue
     */
    private void createPendingOrder(OrderRequest orderRequest, String reason) {
        try {
            Order order = new Order();
            order.setCustomerId(orderRequest.getCustomerId());
            order.setEventId(orderRequest.getEventId());
            order.setTicketQuantity(orderRequest.getTicketQuantity());
            order.setTotalPrice(BigDecimal.ZERO);
            order.setStatus(Order.OrderStatus.PENDING);
            orderRepository.save(order);
            
            log.info("Tạo đơn hàng PENDING - Lý do: {}", reason);
            
            // Giữ nguyên status PROCESSING trong Redis vì đang chờ retry
        } catch (Exception e) {
            log.error("Lỗi khi tạo đơn hàng PENDING: {}", e.getMessage());
            log.error("Lỗi khi tạo đơn hàng PENDING: {}", e.getMessage());
        }
    }

    /**
     * Tạo đơn hàng với trạng thái FAILED
     * 
     * Resumable Queue: Cập nhật trạng thái FAILED vào Redis
     */
    private void createFailedOrder(OrderRequest orderRequest, String reason) {
        String requestId = orderRequest.getRequestId();
        
        try {
            Order order = new Order();
            order.setCustomerId(orderRequest.getCustomerId());
            order.setEventId(orderRequest.getEventId());
            order.setTicketQuantity(orderRequest.getTicketQuantity());
            order.setTotalPrice(BigDecimal.ZERO);
            order.setStatus(Order.OrderStatus.FAILED);
            orderRepository.save(order);
            
            log.warn("Tạo đơn hàng FAILED - RequestID: {}, Lý do: {}", requestId, reason);

            // RESUMABLE QUEUE: Đánh dấu FAILED trong Redis
            String failMessage = "Đặt vé thất bại: " + reason;
            orderQueueService.markAsFailed(requestId, failMessage);

            // Gửi WebSocket notification cho customer
            try {
                notificationService.notifyOrderProcessed(
                        orderRequest.getCustomerId(),
                        order.getId(),
                        "FAILED",
                        failMessage
                );
            } catch (Exception e) {
                log.error("Lỗi gửi notification: {}", e.getMessage());
                log.error("Lỗi gửi notification: {}", e.getMessage());
            }
        } catch (Exception e) {
            log.error("Lỗi khi tạo đơn hàng FAILED: {}", e.getMessage());
            
            // Vẫn đánh dấu FAILED trong Redis dù không tạo được Order
            orderQueueService.markAsFailed(requestId, "Lỗi hệ thống: " + e.getMessage());
        }
    }
}
