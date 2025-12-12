package com.ticket.service;

import com.ticket.dto.OrderRequest;
import com.ticket.dto.OrderResponse;
import com.ticket.dto.OrderStatusResponse;
import com.ticket.entity.Order;
import com.ticket.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderProducerService orderProducerService;

    public OrderStatusResponse createOrderRequest(OrderRequest orderRequest) {
        log.info("Nhận yêu cầu đặt vé - Customer: {}, Event: {}, Quantity: {}",
                orderRequest.getCustomerId(), orderRequest.getEventId(), orderRequest.getTicketQuantity());
        orderProducerService.sendOrderRequest(orderRequest);
        return OrderStatusResponse.pending();
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getMyOrders(UUID customerId) {
        List<Order> orders = orderRepository.findByCustomerId(customerId);
        return orders.stream()
                .map(OrderResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
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
        List<Order> orders = orderRepository.findByEventId(eventId);
        return orders.stream()
                .map(OrderResponse::fromEntity)
                .collect(Collectors.toList());
    }
}
