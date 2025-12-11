package com.ticket.controller;

import com.ticket.dto.MessageResponse;
import com.ticket.dto.OrderRequest;
import com.ticket.dto.OrderResponse;
import com.ticket.dto.OrderStatusResponse;
import com.ticket.security.UserDetailsImpl;
import com.ticket.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    /**
     * API đặt vé (chỉ cho CUSTOMER)
     * POST /api/orders
     * 
     * Logic quan trọng:
     * 1. Lấy customerId từ JWT token (không tin tưởng client)
     * 2. Gửi yêu cầu vào Kafka
     * 3. Trả về ngay lập tức với status PENDING
     */
    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> createOrder(
            @Valid @RequestBody OrderRequest orderRequest,
            Authentication authentication) {
        try {
            // Lấy customerId từ JWT token (QUAN TRỌNG!)
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            Long customerId = userDetails.getId();
            
            // Set customerId vào request
            orderRequest.setCustomerId(customerId);

            // Gửi yêu cầu vào Kafka và trả về ngay
            OrderStatusResponse response = orderService.createOrderRequest(orderRequest);

            return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Lỗi khi tạo đơn hàng: " + e.getMessage()));
        }
    }

    /**
     * API xem danh sách đơn hàng của tôi (CUSTOMER)
     * GET /api/orders/my-orders
     */
    @GetMapping("/my-orders")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<OrderResponse>> getMyOrders(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long customerId = userDetails.getId();
        
        List<OrderResponse> orders = orderService.getMyOrders(customerId);
        return ResponseEntity.ok(orders);
    }

    /**
     * API xem chi tiết một đơn hàng (CUSTOMER)
     * GET /api/orders/{id}
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> getOrderById(
            @PathVariable Long id,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            Long customerId = userDetails.getId();
            
            OrderResponse order = orderService.getOrderById(id, customerId);
            return ResponseEntity.ok(order);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * API admin xem tất cả đơn hàng
     * GET /api/orders/admin/all
     */
    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<OrderResponse>> getAllOrders() {
        List<OrderResponse> orders = orderService.getAllOrders();
        return ResponseEntity.ok(orders);
    }

    /**
     * API xem đơn hàng theo Event (ORGANIZER hoặc ADMIN)
     * GET /api/orders/event/{eventId}
     */
    @GetMapping("/event/{eventId}")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<List<OrderResponse>> getOrdersByEventId(@PathVariable Long eventId) {
        List<OrderResponse> orders = orderService.getOrdersByEventId(eventId);
        return ResponseEntity.ok(orders);
    }
}

