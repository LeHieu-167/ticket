package com.ticket.service;

import com.ticket.entity.Event;
import com.ticket.entity.Order;
import com.ticket.repository.EventRepository;
import com.ticket.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

/**
 * Scheduled Job để dọn dẹp các đơn hàng hết hạn (Booking Session Timeout)
 * 
 * Nguyên tắc:
 * - Redis tự xóa key sau TTL, nhưng Database vẫn lưu đơn hàng PENDING/CONFIRMED
 * - Job này chạy định kỳ để:
 *   1. Chuyển đơn hết hạn sang status EXPIRED
 *   2. Hoàn trả số lượng vé vào tồn kho (nếu đơn đã CONFIRMED)
 * 
 * Tần suất chạy: Mỗi phút 1 lần
 */
@Component
@EnableScheduling
@RequiredArgsConstructor
@Slf4j
public class OrderCleanupJob {

    private final OrderRepository orderRepository;
    private final EventRepository eventRepository;
    private final NotificationService notificationService;

    /**
     * Job dọn dẹp các đơn hàng đã hết hạn
     * Chạy mỗi 60 giây (1 phút)
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void cleanupExpiredOrders() {
        LocalDateTime now = LocalDateTime.now();
        
        log.debug("Bắt đầu dọn dẹp đơn hàng hết hạn - Thời điểm: {}", now);

        // 1. Tìm các đơn CONFIRMED chưa thanh toán đã quá hạn
        // Đây là các đơn cần hoàn trả vé
        List<Order> expiredConfirmedOrders = orderRepository.findExpiredConfirmedOrders(now);
        
        if (!expiredConfirmedOrders.isEmpty()) {
            log.info("Tìm thấy {} đơn CONFIRMED đã hết hạn, bắt đầu hoàn trả vé...", 
                    expiredConfirmedOrders.size());
            
            for (Order order : expiredConfirmedOrders) {
                try {
                    processExpiredOrder(order);
                } catch (Exception e) {
                    log.error("Lỗi khi xử lý đơn hết hạn {}: {}", order.getId(), e.getMessage(), e);
                }
            }
        }

        // 2. Tìm các đơn PENDING đã quá hạn (không cần hoàn vé vì chưa trừ kho)
        List<Order> expiredPendingOrders = orderRepository.findByStatusInAndExpiredAtBefore(
                Arrays.asList(Order.OrderStatus.PENDING, Order.OrderStatus.PROCESSING),
                now
        );
        
        if (!expiredPendingOrders.isEmpty()) {
            log.info("Tìm thấy {} đơn PENDING/PROCESSING đã hết hạn", expiredPendingOrders.size());
            
            for (Order order : expiredPendingOrders) {
                order.setStatus(Order.OrderStatus.EXPIRED);
                log.info("Đơn hàng {} đã được đánh dấu EXPIRED (không cần hoàn vé)", order.getId());
            }
            
            orderRepository.saveAll(expiredPendingOrders);
        }
        
        int totalProcessed = expiredConfirmedOrders.size() + expiredPendingOrders.size();
        if (totalProcessed > 0) {
            log.info("Hoàn tất dọn dẹp: {} đơn hàng đã được xử lý", totalProcessed);
        }
    }

    /**
     * Xử lý đơn hàng CONFIRMED đã hết hạn:
     * - Chuyển status sang EXPIRED
     * - Hoàn trả số vé vào tồn kho
     * - Gửi notification cho user
     */
    private void processExpiredOrder(Order order) {
        log.info("Xử lý đơn hết hạn: {} - Event: {} - Số vé: {}", 
                order.getId(), order.getEventId(), order.getTicketQuantity());

        // 1. Hoàn trả vé vào tồn kho
        Event event = eventRepository.findById(order.getEventId()).orElse(null);
        
        if (event != null) {
            Integer currentTickets = event.getAvailableTickets();
            Integer returnedTickets = order.getTicketQuantity();
            Integer newAvailableTickets = currentTickets + returnedTickets;
            
            event.setAvailableTickets(newAvailableTickets);
            eventRepository.save(event);
            
            log.info("Đã hoàn trả {} vé cho sự kiện {} - Tồn kho mới: {}", 
                    returnedTickets, event.getId(), newAvailableTickets);
        } else {
            log.warn("Không tìm thấy sự kiện {} để hoàn trả vé", order.getEventId());
        }

        // 2. Cập nhật status đơn hàng
        order.setStatus(Order.OrderStatus.EXPIRED);
        orderRepository.save(order);
        
        log.info("Đơn hàng {} đã được đánh dấu EXPIRED", order.getId());

        // 3. Gửi notification cho user
        try {
            String message = String.format(
                    "Đơn hàng #%s đã hết hạn thanh toán. %d vé đã được hoàn trả về hệ thống. " +
                    "Nếu bạn vẫn muốn mua vé, vui lòng đặt lại.",
                    order.getId().toString().substring(0, 8), 
                    order.getTicketQuantity()
            );
            
            notificationService.notifyOrderProcessed(
                    order.getCustomerId(),
                    order.getId(),
                    "EXPIRED",
                    message
            );
        } catch (Exception e) {
            log.error("Lỗi gửi notification cho đơn hết hạn: {}", e.getMessage());
        }
    }
}
