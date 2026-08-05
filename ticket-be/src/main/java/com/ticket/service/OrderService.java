package com.ticket.service;

import com.ticket.dto.OrderRequest;
import com.ticket.dto.OrderResponse;
import com.ticket.entity.Event;
import com.ticket.entity.Order;
import com.ticket.repository.EventRepository;
import com.ticket.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderProducerService orderProducerService;
    private final EventRepository eventRepository;

    /**
     * Tạo yêu cầu đặt vé (gửi vào Kafka)
     * Đây là entry point cho việc đặt vé
     * 
     * Lưu ý: Logic Resumable Queue (idempotency check, Redis marking) 
     * được xử lý ở OrderController trước khi gọi method này.
     */
    public void createOrderRequest(OrderRequest orderRequest) {
        log.info("Gửi yêu cầu đặt vé vào Kafka - RequestID: {}, Customer: {}, Event: {}, Quantity: {}",
                orderRequest.getRequestId(), orderRequest.getCustomerId(), 
                orderRequest.getEventId(), orderRequest.getTicketQuantity());

        // Gửi yêu cầu vào Kafka (bất đồng bộ)
        orderProducerService.sendOrderRequest(orderRequest);
        
        // Response được tạo ở Controller với OrderStatusResponse.queued(requestId)
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getMyOrders(UUID customerId) {
    public List<OrderResponse> getMyOrders(UUID customerId) {
        List<Order> orders = orderRepository.findByCustomerId(customerId);
        return orders.stream()
                .map(OrderResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderById(UUID orderId, UUID customerId) {
    public OrderResponse getOrderById(UUID orderId, UUID customerId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng với ID: " + orderId));
        if (!order.getCustomerId().equals(customerId)) {
            throw new RuntimeException("Bạn không có quyền xem đơn hàng này");
        }
        return OrderResponse.fromEntity(order);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getAllOrders() {
        List<Order> orders = orderRepository.findAll();
        return orders.stream()
                .map(OrderResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrdersByEventId(UUID eventId) {
    public List<OrderResponse> getOrdersByEventId(UUID eventId) {
        List<Order> orders = orderRepository.findByEventId(eventId);
        return orders.stream()
                .map(OrderResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Hủy đơn hàng và hoàn trả vé về tồn kho
     * Chỉ có thể hủy đơn hàng chưa thanh toán
     */
    @Transactional
    public OrderResponse cancelOrder(UUID orderId, UUID customerId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng với ID: " + orderId));

        // Kiểm tra quyền sở hữu
        if (!order.getCustomerId().equals(customerId)) {
            throw new RuntimeException("Bạn không có quyền hủy đơn hàng này");
        }

        // Kiểm tra trạng thái - chỉ có thể hủy đơn chưa thanh toán
        if (order.getPaymentStatus() == Order.PaymentStatus.PAID) {
            throw new RuntimeException("Không thể hủy đơn hàng đã thanh toán");
        }

        // Kiểm tra nếu đã bị hủy rồi
        if (order.getStatus() == Order.OrderStatus.CANCELLED || 
            order.getStatus() == Order.OrderStatus.EXPIRED) {
            throw new RuntimeException("Đơn hàng đã bị hủy trước đó");
        }

        // Hoàn trả vé vào tồn kho
        returnTicketsToInventory(order);

        // Cập nhật status
        order.setStatus(Order.OrderStatus.CANCELLED);
        orderRepository.save(order);

        log.info("Đơn hàng {} đã được hủy bởi khách hàng {}", orderId, customerId);

        return OrderResponse.fromEntity(order);
    }

    /**
     * Hoàn trả vé vào tồn kho
     */
    private void returnTicketsToInventory(Order order) {
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
    }

    /**
     * Hủy đơn hàng theo username (từ JWT token)
     * Dùng cho endpoint beacon-cancel khi người dùng rời trang
     * 
     * @param orderId ID của đơn hàng
     * @param customerId UUID của customer (lấy từ JWT)
     */
    @Transactional
    public void cancelOrderByBeacon(UUID orderId, UUID customerId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        
        if (order == null) {
            log.warn("Beacon cancel - Không tìm thấy đơn hàng: {}", orderId);
            return; // Silent fail - không throw exception
        }

        // KIỂM TRA QUYỀN SỞ HỮU - Quan trọng để tránh IDOR
        if (!order.getCustomerId().equals(customerId)) {
            log.warn("Beacon cancel - Customer {} không có quyền hủy đơn hàng {}", 
                    customerId, orderId);
            return; // Silent fail
        }

        // Chỉ hủy nếu đơn hàng đang ở trạng thái phù hợp (chưa thanh toán)
        if (order.getStatus() == Order.OrderStatus.CONFIRMED && 
            order.getPaymentStatus() == Order.PaymentStatus.PENDING) {
            
            // Hoàn trả vé vào tồn kho
            returnTicketsToInventory(order);

            // Cập nhật status
            order.setStatus(Order.OrderStatus.CANCELLED);
            orderRepository.save(order);

            log.info("Beacon cancel - Đơn hàng {} đã được hủy tự động khi khách {} rời trang", 
                    orderId, customerId);
        } else {
            log.debug("Beacon cancel - Đơn hàng {} không thể hủy (status: {}, payment: {})", 
                    orderId, order.getStatus(), order.getPaymentStatus());
        }
    }
}
