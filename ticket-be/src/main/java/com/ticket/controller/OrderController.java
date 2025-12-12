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
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> createOrder(
            @Valid @RequestBody OrderRequest orderRequest,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            UUID customerId = userDetails.getId();
            orderRequest.setCustomerId(customerId);
            OrderStatusResponse response = orderService.createOrderRequest(orderRequest);
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Lỗi khi tạo đơn hàng: " + e.getMessage()));
        }
    }

    @GetMapping("/my-orders")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<OrderResponse>> getMyOrders(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        UUID customerId = userDetails.getId();
        List<OrderResponse> orders = orderService.getMyOrders(customerId);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> getOrderById(
            @PathVariable UUID id,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            UUID customerId = userDetails.getId();
            OrderResponse order = orderService.getOrderById(id, customerId);
            return ResponseEntity.ok(order);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new MessageResponse(e.getMessage()));
        }
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<OrderResponse>> getAllOrders() {
        List<OrderResponse> orders = orderService.getAllOrders();
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/event/{eventId}")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<List<OrderResponse>> getOrdersByEventId(@PathVariable UUID eventId) {
        List<OrderResponse> orders = orderService.getOrdersByEventId(eventId);
        return ResponseEntity.ok(orders);
    }
}
