package com.ticket.service;

import com.ticket.dto.OrderRequest;
import com.ticket.dto.OrderResponse;
import com.ticket.entity.Order;
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
}
