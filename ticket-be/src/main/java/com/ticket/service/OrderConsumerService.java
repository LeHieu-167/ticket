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
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderConsumerService {

    private final EventRepository eventRepository;
    private final OrderRepository orderRepository;
    private final RedissonClient redissonClient;
    private final NotificationService notificationService;

    // Thời gian chờ để lấy lock (10 giây)
    private static final long LOCK_WAIT_TIME = 10L;
    // Thời gian giữ lock tối đa (30 giây)
    private static final long LOCK_LEASE_TIME = 30L;

    /**
     * Consumer lắng nghe Kafka topic "order_requests"
     * Xử lý các yêu cầu đặt vé một cách bất đồng bộ
     */
    @KafkaListener(
            topics = "${kafka.topic.order-requests}",
            groupId = "${spring.kafka.consumer.group-id}",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void consumeOrderRequest(OrderRequest orderRequest) {
        log.info("📨 Nhận được yêu cầu đặt vé từ Kafka - Customer: {}, Event: {}, Quantity: {}",
                orderRequest.getCustomerId(), orderRequest.getEventId(), orderRequest.getTicketQuantity());

        // Tạo lock key cho sự kiện cụ thể
        String lockKey = "event:lock:" + orderRequest.getEventId();
        RLock lock = redissonClient.getLock(lockKey);

        try {
            // Cố gắng lấy lock
            boolean isLocked = lock.tryLock(LOCK_WAIT_TIME, LOCK_LEASE_TIME, TimeUnit.SECONDS);

            if (isLocked) {
                log.info("🔒 Đã giữ lock cho Event ID: {}", orderRequest.getEventId());
                try {
                    // Xử lý đơn hàng (trong transaction)
                    processOrder(orderRequest);
                } finally {
                    // LUÔN LUÔN nhả lock sau khi xử lý xong
                    lock.unlock();
                    log.info("🔓 Đã nhả lock cho Event ID: {}", orderRequest.getEventId());
                }
            } else {
                log.warn("⏳ Không thể lấy lock cho Event ID: {} sau {} giây. Yêu cầu sẽ được retry.",
                        orderRequest.getEventId(), LOCK_WAIT_TIME);
                
                // Tạo đơn hàng với status PENDING (chưa xử lý)
                createPendingOrder(orderRequest, "Không thể lấy lock - Đang chờ xử lý");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("❌ Thread bị interrupt khi chờ lock cho Event ID: {}", orderRequest.getEventId());
            createFailedOrder(orderRequest, "Lỗi hệ thống: Thread interrupted");
        } catch (Exception e) {
            log.error("❌ Lỗi không mong đợi khi xử lý đơn hàng: {}", e.getMessage(), e);
            createFailedOrder(orderRequest, "Lỗi hệ thống: " + e.getMessage());
        }
    }

    /**
     * Xử lý đơn hàng: Kiểm tra tồn kho, trừ kho, tạo order
     * Logic quan trọng: Phải chạy trong transaction để đảm bảo tính nhất quán
     */
    @Transactional
    protected void processOrder(OrderRequest orderRequest) {
        Long eventId = orderRequest.getEventId();
        Long customerId = orderRequest.getCustomerId();
        Integer requestedQuantity = orderRequest.getTicketQuantity();

        log.info("🔄 Bắt đầu xử lý đơn hàng - Event: {}, Customer: {}, Quantity: {}",
                eventId, customerId, requestedQuantity);

        // 1. Kiểm tra sự kiện có tồn tại không
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Sự kiện không tồn tại với ID: " + eventId));

        // 2. Kiểm tra sự kiện có đang hoạt động không
        if (!event.isActive()) {
            log.warn("⚠️ Sự kiện ID: {} không còn hoạt động", eventId);
            createFailedOrder(orderRequest, "Sự kiện không còn hoạt động");
            return;
        }

        // 3. Kiểm tra tồn kho
        Integer availableTickets = event.getAvailableTickets();
        log.info("📊 Số vé hiện tại: {}, Số vé yêu cầu: {}", availableTickets, requestedQuantity);

        if (availableTickets < requestedQuantity) {
            log.warn("❌ Không đủ vé - Còn: {}, Yêu cầu: {}", availableTickets, requestedQuantity);
            createFailedOrder(orderRequest, "Không đủ vé. Chỉ còn " + availableTickets + " vé.");
            return;
        }

        // 4. Trừ tồn kho (CRITICAL SECTION - Được bảo vệ bởi Redis Lock)
        Integer newAvailableTickets = availableTickets - requestedQuantity;
        event.setAvailableTickets(newAvailableTickets);
        eventRepository.save(event);

        log.info("✅ Đã trừ tồn kho - Còn lại: {} vé", newAvailableTickets);

        // 5. Tạo đơn hàng thành công
        BigDecimal totalPrice = event.getTicketPrice().multiply(BigDecimal.valueOf(requestedQuantity));

        Order order = new Order();
        order.setCustomerId(customerId);
        order.setEventId(eventId);
        order.setTicketQuantity(requestedQuantity);
        order.setTotalPrice(totalPrice);
        order.setStatus(Order.OrderStatus.CONFIRMED);

        orderRepository.save(order);

        log.info("✅ Đơn hàng đã được xác nhận - Order ID: {}, Total: {} VND",
                order.getId(), totalPrice);

        // 6. Gửi WebSocket notification cho customer
        try {
            String message = String.format(
                    "Đơn hàng #%d đã được xác nhận! Bạn đã đặt %d vé. Tổng tiền: %,d VND. Vui lòng thanh toán để hoàn tất.",
                    order.getId(), requestedQuantity, totalPrice.longValue()
            );
            notificationService.notifyOrderProcessed(customerId, order.getId(), "CONFIRMED", message);
        } catch (Exception e) {
            log.error("❌ Lỗi gửi notification: {}", e.getMessage());
        }
    }

    /**
     * Tạo đơn hàng với trạng thái PENDING
     */
    private void createPendingOrder(OrderRequest orderRequest, String reason) {
        try {
            Order order = new Order();
            order.setCustomerId(orderRequest.getCustomerId());
            order.setEventId(orderRequest.getEventId());
            order.setTicketQuantity(orderRequest.getTicketQuantity());
            order.setTotalPrice(BigDecimal.ZERO); // Chưa tính được giá
            order.setStatus(Order.OrderStatus.PENDING);
            orderRepository.save(order);
            
            log.info("⏳ Tạo đơn hàng PENDING - Lý do: {}", reason);
        } catch (Exception e) {
            log.error("❌ Lỗi khi tạo đơn hàng PENDING: {}", e.getMessage());
        }
    }

    /**
     * Tạo đơn hàng với trạng thái FAILED
     */
    private void createFailedOrder(OrderRequest orderRequest, String reason) {
        try {
            Order order = new Order();
            order.setCustomerId(orderRequest.getCustomerId());
            order.setEventId(orderRequest.getEventId());
            order.setTicketQuantity(orderRequest.getTicketQuantity());
            order.setTotalPrice(BigDecimal.ZERO);
            order.setStatus(Order.OrderStatus.FAILED);
            orderRepository.save(order);
            
            log.warn("❌ Tạo đơn hàng FAILED - Lý do: {}", reason);

            // Gửi WebSocket notification cho customer
            try {
                notificationService.notifyOrderProcessed(
                        orderRequest.getCustomerId(),
                        order.getId(),
                        "FAILED",
                        "Đặt vé thất bại: " + reason
                );
            } catch (Exception e) {
                log.error("❌ Lỗi gửi notification: {}", e.getMessage());
            }
        } catch (Exception e) {
            log.error("❌ Lỗi khi tạo đơn hàng FAILED: {}", e.getMessage());
        }
    }
}

