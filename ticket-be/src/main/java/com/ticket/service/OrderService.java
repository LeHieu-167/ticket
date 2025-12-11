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
     */
    public OrderStatusResponse createOrderRequest(OrderRequest orderRequest) {
        log.info("Nhận yêu cầu đặt vé - Customer: {}, Event: {}, Quantity: {}",
                orderRequest.getCustomerId(), orderRequest.getEventId(), orderRequest.getTicketQuantity());

        // Gửi yêu cầu vào Kafka (bất đồng bộ)
        orderProducerService.sendOrderRequest(orderRequest);

        // Trả về ngay lập tức cho client
        return OrderStatusResponse.pending();
    }

    /**
     * Lấy danh sách đơn hàng của customer
     */
    @Transactional(readOnly = true)
    public List<OrderResponse> getMyOrders(Long customerId) {
        List<Order> orders = orderRepository.findByCustomerId(customerId);
        return orders.stream()
                .map(OrderResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Lấy chi tiết một đơn hàng
     */
    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long orderId, Long customerId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng với ID: " + orderId));

        // Kiểm tra quyền sở hữu
        if (!order.getCustomerId().equals(customerId)) {
            throw new RuntimeException("Bạn không có quyền xem đơn hàng này");
        }

        return OrderResponse.fromEntity(order);
    }

    /**
     * Admin: Lấy tất cả đơn hàng
     */
    @Transactional(readOnly = true)
    public List<OrderResponse> getAllOrders() {
        List<Order> orders = orderRepository.findAll();
        return orders.stream()
                .map(OrderResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Admin hoặc Organizer: Lấy đơn hàng theo Event
     */
    @Transactional(readOnly = true)
    public List<OrderResponse> getOrdersByEventId(Long eventId) {
        List<Order> orders = orderRepository.findByEventId(eventId);
        return orders.stream()
                .map(OrderResponse::fromEntity)
                .collect(Collectors.toList());
    }
}

