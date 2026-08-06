package com.ticket.controller;

import com.ticket.dto.BeaconCancelRequest;
import com.ticket.dto.MessageResponse;
import com.ticket.dto.OrderRequest;
import com.ticket.dto.OrderResponse;
import com.ticket.dto.OrderStatusResponse;
import com.ticket.security.JwtUtils;
import com.ticket.security.UserDetailsImpl;
import com.ticket.service.OrderQueueService;
import com.ticket.service.OrderService;
import com.ticket.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
    private final JwtUtils jwtUtils;
    private final UserService userService;

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

    /**
     * API hủy đơn hàng chưa thanh toán (CUSTOMER)
     * DELETE /api/orders/{id}/cancel
     * 
     * Chỉ có thể hủy đơn hàng:
     * - Chưa thanh toán (PaymentStatus != PAID)
     * - Chưa bị hủy trước đó
     * 
     * Khi hủy, vé sẽ được hoàn trả về tồn kho
     */
    @DeleteMapping("/{id}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> cancelOrder(
            @PathVariable UUID id,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            UUID customerId = userDetails.getId();

            log.info("Yêu cầu hủy đơn hàng {} từ customer {}", id, customerId);

            OrderResponse order = orderService.cancelOrder(id, customerId);
            return ResponseEntity.ok(order);
        } catch (RuntimeException e) {
            log.error("Lỗi khi hủy đơn hàng {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest()
                    .body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * API hủy đơn hàng từ navigator.sendBeacon() khi người dùng rời trang
     * POST /api/orders/beacon-cancel
     * 
     * Endpoint này:
     * - Không yêu cầu authentication header (sendBeacon không hỗ trợ)
     * - Xác thực JWT token từ request body
     * - Kiểm tra quyền sở hữu đơn hàng trước khi hủy (tránh IDOR)
     * - Luôn trả về 200 OK (silent fail để tránh tấn công dò thông tin)
     */
    @PostMapping(value = "/beacon-cancel", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Void> beaconCancelOrder(@RequestBody BeaconCancelRequest request) {
        log.info("Nhận yêu cầu beacon-cancel cho orderId: {}", request.getOrderId());
        
        // Validate input
        if (request.getOrderId() == null || request.getToken() == null || request.getToken().isEmpty()) {
            log.warn("Beacon cancel - Request không hợp lệ (thiếu orderId hoặc token)");
            return ResponseEntity.ok().build(); // Silent fail
        }

        try {
            // 1. Xác thực JWT token thủ công
            if (!jwtUtils.validateJwtToken(request.getToken())) {
                log.warn("Beacon cancel - Token không hợp lệ cho orderId: {}", request.getOrderId());
                return ResponseEntity.ok().build(); // Silent fail
            }

            // 2. Lấy username từ token
            String username = jwtUtils.getUserNameFromJwtToken(request.getToken());
            
            // 3. Lấy userId từ username
            UUID customerId = userService.getUserIdByUsername(username);
            if (customerId == null) {
                log.warn("Beacon cancel - Không tìm thấy user với username: {}", username);
                return ResponseEntity.ok().build(); // Silent fail
            }

            // 4. Gọi service để hủy đơn hàng (có kiểm tra quyền sở hữu)
            orderService.cancelOrderByBeacon(request.getOrderId(), customerId);
            
            log.info("Beacon cancel - Xử lý thành công cho orderId: {}", request.getOrderId());
            
        } catch (Exception e) {
            // Silent fail - không báo lỗi ra ngoài để tránh tấn công dò thông tin
            log.error("Beacon cancel - Lỗi khi xử lý orderId {}: {}", 
                    request.getOrderId(), e.getMessage());
        }

        // Luôn trả về 200 OK
        return ResponseEntity.ok().build();
    }
}
