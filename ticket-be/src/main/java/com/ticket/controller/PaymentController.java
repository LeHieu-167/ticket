package com.ticket.controller;

import com.ticket.dto.MessageResponse;
import com.ticket.dto.PaymentCallbackResponse;
import com.ticket.dto.PaymentRequest;
import com.ticket.dto.PaymentResponse;
import com.ticket.entity.Order;
import com.ticket.repository.OrderRepository;
import com.ticket.service.VNPayService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final VNPayService vnPayService;
    private final OrderRepository orderRepository;
    
    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    /**
     * API tạo URL thanh toán VNPay
     * POST /api/payment/create
     * 
     * Customer sau khi đặt vé thành công (order status = CONFIRMED)
     * sẽ gọi API này để lấy URL thanh toán
     */
    @PostMapping("/create")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> createPayment(
            @RequestBody PaymentRequest paymentRequest,
            HttpServletRequest request) {
        try {
            log.info("Tạo yêu cầu thanh toán - Order ID: {}", paymentRequest.getOrderId());
            
            PaymentResponse paymentResponse = vnPayService.createPaymentUrl(paymentRequest, request);
            
            if ("00".equals(paymentResponse.getCode())) {
                return ResponseEntity.ok(paymentResponse);
            } else {
                return ResponseEntity.badRequest().body(paymentResponse);
            }
        } catch (Exception e) {
            log.error("Lỗi tạo thanh toán: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Lỗi hệ thống: " + e.getMessage()));
        }
    }

    /**
     * API callback từ VNPay (GET)
     * GET /api/payment/vnpay-return
     * 
     * VNPay sẽ redirect user về URL này sau khi thanh toán
     * Sau khi xử lý, redirect user về frontend confirmation page
     */
    @GetMapping("/vnpay-return")
    public void vnpayReturn(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String redirectUrl = frontendUrl; // Default fallback
        
        try {
            // Lấy tất cả params từ VNPay
            Map<String, String> vnpParams = new HashMap<>();
            request.getParameterMap().forEach((key, values) -> {
                if (values.length > 0) {
                    vnpParams.put(key, values[0]);
                }
            });

            String txnRef = vnpParams.get("vnp_TxnRef");
            String responseCode = vnpParams.get("vnp_ResponseCode");
            
            log.info("VNPay Return - TxnRef: {}, ResponseCode: {}", txnRef, responseCode);
            log.info("VNPay Return - Full params: {}", vnpParams);

            // Xử lý callback
            boolean processed = vnPayService.handlePaymentCallback(vnpParams);
            log.info("VNPay Return - Processed: {}", processed);
            
            // Extract orderId and find eventId from database
            String orderId = "";
            String eventId = "event"; // default fallback
            
            if (txnRef != null && txnRef.startsWith("ORDER")) {
                // Extract UUID from txnRef (format: ORDER{uuid}_{timestamp})
                String[] parts = txnRef.split("_");
                if (parts.length > 0) {
                    orderId = parts[0].substring(5); // Remove "ORDER" prefix
                    
                    // Lookup eventId from order
                    try {
                        UUID orderUUID = UUID.fromString(orderId);
                        Order order = orderRepository.findById(orderUUID).orElse(null);
                        if (order != null && order.getEventId() != null) {
                            eventId = order.getEventId().toString();
                            log.info("VNPay Return - Found order: {}, eventId: {}", orderId, eventId);
                        }
                    } catch (Exception ex) {
                        log.warn("Không thể lấy eventId từ order: {}", ex.getMessage());
                    }
                }
            }
            
            // Build redirect URL to frontend
            if ("00".equals(responseCode) && processed) {
                // Success - redirect to confirmation page
                redirectUrl = String.format("%s/booking/%s/confirmation?orderId=%s&success=true", 
                        frontendUrl, eventId, orderId);
                log.info("VNPay Return - Redirecting to success page: {}", redirectUrl);
            } else {
                // Failed - redirect back to payment page with error
                String message = vnPayService.getResponseMessage(responseCode);
                redirectUrl = String.format("%s/booking/%s/payment?error=%s&code=%s", 
                        frontendUrl, eventId, 
                        URLEncoder.encode(message, StandardCharsets.UTF_8), responseCode);
                log.warn("VNPay Return - Redirecting to error page: {}", redirectUrl);
            }
                    
        } catch (Exception e) {
            log.error("Lỗi xử lý VNPay return: {}", e.getMessage(), e);
            // Redirect to error page
            redirectUrl = String.format("%s?error=%s", frontendUrl, 
                    URLEncoder.encode("Lỗi xử lý thanh toán: " + e.getMessage(), StandardCharsets.UTF_8));
        }
        
        // Thực hiện redirect bằng HttpServletResponse
        response.sendRedirect(redirectUrl);
    }

    /**
     * API IPN (Instant Payment Notification) từ VNPay (POST)
     * POST /api/payment/vnpay-ipn
     * 
     * VNPay sẽ gọi API này để thông báo kết quả thanh toán
     * (Chạy song song với vnpay-return, nhưng là server-to-server)
     */
    @PostMapping("/vnpay-ipn")
    public ResponseEntity<PaymentCallbackResponse> vnpayIPN(HttpServletRequest request) {
        try {
            // Lấy tất cả params từ VNPay
            Map<String, String> vnpParams = new HashMap<>();
            request.getParameterMap().forEach((key, values) -> {
                if (values.length > 0) {
                    vnpParams.put(key, values[0]);
                }
            });

            log.info("VNPay IPN - TxnRef: {}, ResponseCode: {}", 
                    vnpParams.get("vnp_TxnRef"), vnpParams.get("vnp_ResponseCode"));

            // Xử lý callback
            boolean success = vnPayService.handlePaymentCallback(vnpParams);
            
            if (success) {
                return ResponseEntity.ok(PaymentCallbackResponse.success());
            } else {
                return ResponseEntity.ok(PaymentCallbackResponse.error("Invalid signature"));
            }
        } catch (Exception e) {
            log.error("Lỗi xử lý VNPay IPN: {}", e.getMessage());
            return ResponseEntity.ok(PaymentCallbackResponse.error("System error"));
        }
    }

    /**
     * API kiểm tra trạng thái thanh toán của order
     * GET /api/payment/status/{orderId}
     */
    @GetMapping("/status/{orderId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> checkPaymentStatus(@PathVariable UUID orderId) {
        // TODO: Implement check payment status
        return ResponseEntity.ok(new MessageResponse("Coming soon"));
    }
}

