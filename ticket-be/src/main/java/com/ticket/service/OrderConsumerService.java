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
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderConsumerService {

    private final EventRepository eventRepository;
    private final OrderRepository orderRepository;
    private final RedissonClient redissonClient;
    private final NotificationService notificationService;

    private static final long LOCK_WAIT_TIME = 10L;
    private static final long LOCK_LEASE_TIME = 30L;

    @KafkaListener(
            topics = "${kafka.topic.order-requests}",
            groupId = "${spring.kafka.consumer.group-id}",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void consumeOrderRequest(OrderRequest orderRequest) {
        log.info("Nhận được yêu cầu đặt vé từ Kafka - Customer: {}, Event: {}, Quantity: {}",
                orderRequest.getCustomerId(), orderRequest.getEventId(), orderRequest.getTicketQuantity());

        String lockKey = "event:lock:" + orderRequest.getEventId().toString();
        RLock lock = redissonClient.getLock(lockKey);

        try {
            boolean isLocked = lock.tryLock(LOCK_WAIT_TIME, LOCK_LEASE_TIME, TimeUnit.SECONDS);

            if (isLocked) {
                log.info("Đã giữ lock cho Event ID: {}", orderRequest.getEventId());
                try {
                    processOrder(orderRequest);
                } finally {
                    lock.unlock();
                    log.info("Đã nhả lock cho Event ID: {}", orderRequest.getEventId());
                }
            } else {
                log.warn("Không thể lấy lock cho Event ID: {} sau {} giây", orderRequest.getEventId(), LOCK_WAIT_TIME);
                createPendingOrder(orderRequest, "Không thể lấy lock - Đang chờ xử lý");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Thread bị interrupt khi chờ lock cho Event ID: {}", orderRequest.getEventId());
            createFailedOrder(orderRequest, "Lỗi hệ thống: Thread interrupted");
        } catch (Exception e) {
            log.error("Lỗi không mong đợi khi xử lý đơn hàng: {}", e.getMessage(), e);
            createFailedOrder(orderRequest, "Lỗi hệ thống: " + e.getMessage());
        }
    }

    @Transactional
    protected void processOrder(OrderRequest orderRequest) {
        UUID eventId = orderRequest.getEventId();
        UUID customerId = orderRequest.getCustomerId();
        Integer requestedQuantity = orderRequest.getTicketQuantity();

        log.info("Bắt đầu xử lý đơn hàng - Event: {}, Customer: {}, Quantity: {}", eventId, customerId, requestedQuantity);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Sự kiện không tồn tại với ID: " + eventId));

        if (!event.isActive()) {
            log.warn("Sự kiện ID: {} không còn hoạt động", eventId);
            createFailedOrder(orderRequest, "Sự kiện không còn hoạt động");
            return;
        }

        Integer availableTickets = event.getAvailableTickets();
        log.info("Số vé hiện tại: {}, Số vé yêu cầu: {}", availableTickets, requestedQuantity);

        if (availableTickets < requestedQuantity) {
            log.warn("Không đủ vé - Còn: {}, Yêu cầu: {}", availableTickets, requestedQuantity);
            createFailedOrder(orderRequest, "Không đủ vé. Chỉ còn " + availableTickets + " vé.");
            return;
        }

        Integer newAvailableTickets = availableTickets - requestedQuantity;
        event.setAvailableTickets(newAvailableTickets);
        eventRepository.save(event);

        log.info("Đã trừ tồn kho - Còn lại: {} vé", newAvailableTickets);

        BigDecimal totalPrice = event.getTicketPrice().multiply(BigDecimal.valueOf(requestedQuantity));

        Order order = new Order();
        order.setCustomerId(customerId);
        order.setEventId(eventId);
        order.setTicketQuantity(requestedQuantity);
        order.setTotalPrice(totalPrice);
        order.setStatus(Order.OrderStatus.CONFIRMED);

        orderRepository.save(order);

        log.info("Đơn hàng đã được xác nhận - Order ID: {}, Total: {} VND", order.getId(), totalPrice);

        try {
            String message = String.format(
                    "Đơn hàng #%s đã được xác nhận! Bạn đã đặt %d vé. Tổng tiền: %,d VND. Vui lòng thanh toán để hoàn tất.",
                    order.getId().toString().substring(0, 8), requestedQuantity, totalPrice.longValue()
            );
            notificationService.notifyOrderProcessed(customerId, order.getId(), "CONFIRMED", message);
        } catch (Exception e) {
            log.error("Lỗi gửi notification: {}", e.getMessage());
        }
    }

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
        } catch (Exception e) {
            log.error("Lỗi khi tạo đơn hàng PENDING: {}", e.getMessage());
        }
    }

    private void createFailedOrder(OrderRequest orderRequest, String reason) {
        try {
            Order order = new Order();
            order.setCustomerId(orderRequest.getCustomerId());
            order.setEventId(orderRequest.getEventId());
            order.setTicketQuantity(orderRequest.getTicketQuantity());
            order.setTotalPrice(BigDecimal.ZERO);
            order.setStatus(Order.OrderStatus.FAILED);
            orderRepository.save(order);
            log.warn("Tạo đơn hàng FAILED - Lý do: {}", reason);

            try {
                notificationService.notifyOrderProcessed(
                        orderRequest.getCustomerId(),
                        order.getId(),
                        "FAILED",
                        "Đặt vé thất bại: " + reason
                );
            } catch (Exception e) {
                log.error("Lỗi gửi notification: {}", e.getMessage());
            }
        } catch (Exception e) {
            log.error("Lỗi khi tạo đơn hàng FAILED: {}", e.getMessage());
        }
    }
}
