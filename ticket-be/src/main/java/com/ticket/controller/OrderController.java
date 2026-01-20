package com.ticket.controller;

import com.ticket.dto.MessageResponse;
import com.ticket.dto.OrderRequest;
import com.ticket.dto.OrderResponse;
import com.ticket.dto.OrderStatusResponse;
import com.ticket.security.UserDetailsImpl;
import com.ticket.service.OrderQueueService;
import com.ticket.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Controller xử lý các API liên quan đến đặt vé
 * 
 * Hỗ trợ cơ chế Resumable Queue:
 * - Người dùng có thể reload trang mà vẫn giữ vị trí trong hàng chờ
 * - Idempotency: Tránh duplicate request khi người dùng gửi lại
 */
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Slf4j
public class OrderController {

    private final OrderService orderService;
    private final OrderQueueService orderQueueService;

    /**
     * API đặt vé (chỉ cho CUSTOMER)
     * POST /api/orders
     * 
     * Cơ chế Resumable Queue:
     * 1. Kiểm tra requestId đã tồn tại trong Redis chưa (Idempotency)
     * 2. Nếu đã tồn tại -> Trả về trạng thái hiện tại (không tạo request mới)
     * 3. Nếu chưa tồn tại -> Đánh dấu QUEUED và gửi vào Kafka
     * 
     */
    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> createOrder(
            @Valid @RequestBody OrderRequest orderRequest,
            Authentication authentication) {
        try {
            // 1. Lấy customerId từ JWT token (QUAN TRỌNG - không tin client!)
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            UUID customerId = userDetails.getId();
            orderRequest.setCustomerId(customerId);

            String requestId = orderRequest.getRequestId();
            log.info(" Nhận yêu cầu đặt vé - RequestID: {}, Customer: {}, Event: {}", 
                    requestId, customerId, orderRequest.getEventId());

            // 2. IDEMPOTENCY CHECK: Kiểm tra request đã tồn tại chưa
            if (orderQueueService.isRequestExists(requestId)) {
                // Request đã tồn tại -> Trả về trạng thái hiện tại
                OrderQueueService.RequestQueueInfo info = orderQueueService.getRequestInfo(requestId);
                
                log.info(" Request {} đã tồn tại với status: {}", requestId, info.status());
                
                OrderStatusResponse response = OrderStatusResponse.alreadyInQueue(
                        requestId, 
                        info.status().name()
                );
                response.setOrderId(info.orderId());
                response.setMessage(info.message() != null ? info.message() : response.getMessage());
                
                return ResponseEntity.ok(response);
            }

            // 3. Đánh dấu request vào hàng chờ (QUEUED) trong Redis
            boolean isQueued = orderQueueService.markAsQueued(requestId);
            
            if (!isQueued) {
                // Race condition: Request vừa được tạo bởi thread khác
                log.warn(" Race condition detected cho requestId: {}", requestId);
                return ResponseEntity.ok(OrderStatusResponse.alreadyInQueue(requestId, "QUEUED"));
            }

            // 4. Gửi yêu cầu vào Kafka
            orderService.createOrderRequest(orderRequest);

            // 5. Trả về ngay với status QUEUED
            return ResponseEntity.status(HttpStatus.ACCEPTED)
                    .body(OrderStatusResponse.queued(requestId));
                    
        } catch (Exception e) {
            log.error(" Lỗi khi tạo đơn hàng: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Lỗi khi tạo đơn hàng: " + e.getMessage()));
        }
    }

    /**
     * API kiểm tra trạng thái đơn hàng theo requestId (Resumable Queue)
     * GET /api/orders/status/{requestId}
     * 
     * Endpoint này cho phép client:
     * - Kiểm tra trạng thái sau khi reload trang
     * - Polling để cập nhật UI (thay vì chỉ dựa vào WebSocket)
     * 
     * Public cho CUSTOMER để có thể gọi sau khi reload
     */
    @GetMapping("/status/{requestId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<OrderStatusResponse> checkOrderStatus(
            @PathVariable String requestId,
            Authentication authentication) {
        
        log.info("🔍 Kiểm tra trạng thái request: {}", requestId);
        
        OrderQueueService.RequestQueueInfo info = orderQueueService.getRequestInfo(requestId);
        
        if (info == null) {
            // Request không tồn tại hoặc đã hết hạn
            log.info("Không tìm thấy request: {}", requestId);
            return ResponseEntity.ok(OrderStatusResponse.notFound(requestId));
        }

        OrderStatusResponse response = OrderStatusResponse.fromQueueInfo(info);
        log.info("Trạng thái request {}: {}", requestId, info.status());
        
        return ResponseEntity.ok(response);
    }

    /**
     * API hủy request trong hàng chờ (nếu chưa được xử lý)
     * DELETE /api/orders/queue/{requestId}
     * 
     * Chỉ cho phép hủy nếu trạng thái là QUEUED
     */
    @DeleteMapping("/queue/{requestId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> cancelQueuedRequest(
            @PathVariable String requestId,
            Authentication authentication) {
        
        log.info("🗑️ Yêu cầu hủy request: {}", requestId);
        
        OrderQueueService.QueueStatus status = orderQueueService.getRequestStatus(requestId);
        
        if (status == null) {
            return ResponseEntity.notFound().build();
        }
        
        if (status != OrderQueueService.QueueStatus.QUEUED) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Không thể hủy request đang được xử lý hoặc đã hoàn thành"));
        }
        
        // Xóa khỏi Redis (message vẫn trong Kafka nhưng Consumer sẽ check Redis trước khi xử lý)
        orderQueueService.removeRequest(requestId);
        
        return ResponseEntity.ok(new MessageResponse("Đã hủy request thành công"));
    }

    /**
     * API xem danh sách đơn hàng của tôi (CUSTOMER)
     * GET /api/orders/my-orders
     */
    @GetMapping("/my-orders")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<OrderResponse>> getMyOrders(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        UUID customerId = userDetails.getId();

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
    public ResponseEntity<List<OrderResponse>> getOrdersByEventId(@PathVariable UUID eventId) {
        List<OrderResponse> orders = orderService.getOrdersByEventId(eventId);
        return ResponseEntity.ok(orders);
    }
}

