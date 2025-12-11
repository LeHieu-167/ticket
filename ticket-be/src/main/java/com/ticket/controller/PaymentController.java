package com.ticket.controller;

import com.ticket.dto.MessageResponse;
import com.ticket.dto.PaymentCallbackResponse;
import com.ticket.dto.PaymentRequest;
import com.ticket.dto.PaymentResponse;
import com.ticket.service.VNPayService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final VNPayService vnPayService;

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
            log.info("📝 Tạo yêu cầu thanh toán - Order ID: {}", paymentRequest.getOrderId());
            
            PaymentResponse paymentResponse = vnPayService.createPaymentUrl(paymentRequest, request);
            
            if ("00".equals(paymentResponse.getCode())) {
                return ResponseEntity.ok(paymentResponse);
            } else {
                return ResponseEntity.badRequest().body(paymentResponse);
            }
        } catch (Exception e) {
            log.error("❌ Lỗi tạo thanh toán: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Lỗi hệ thống: " + e.getMessage()));
        }
    }

    /**
     * API callback từ VNPay (GET)
     * GET /api/payment/vnpay-return
     * 
     * VNPay sẽ redirect user về URL này sau khi thanh toán
     * Hiển thị kết quả thanh toán cho user
     */
    @GetMapping("/vnpay-return")
    public ResponseEntity<?> vnpayReturn(HttpServletRequest request) {
        try {
            // Lấy tất cả params từ VNPay
            Map<String, String> vnpParams = new HashMap<>();
            request.getParameterMap().forEach((key, values) -> {
                if (values.length > 0) {
                    vnpParams.put(key, values[0]);
                }
            });

            log.info("📨 VNPay Return - TxnRef: {}, ResponseCode: {}", 
                    vnpParams.get("vnp_TxnRef"), vnpParams.get("vnp_ResponseCode"));

            // Xử lý callback
            boolean success = vnPayService.handlePaymentCallback(vnpParams);
            
            if (success) {
                String responseCode = vnpParams.get("vnp_ResponseCode");
                String message = vnPayService.getResponseMessage(responseCode);
                
                Map<String, Object> response = new HashMap<>();
                response.put("success", "00".equals(responseCode));
                response.put("responseCode", responseCode);
                response.put("message", message);
                response.put("transactionId", vnpParams.get("vnp_TransactionNo"));
                response.put("txnRef", vnpParams.get("vnp_TxnRef"));
                response.put("amount", vnpParams.get("vnp_Amount"));
                response.put("bankCode", vnpParams.get("vnp_BankCode"));
                response.put("payDate", vnpParams.get("vnp_PayDate"));
                
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Xác thực thanh toán thất bại"));
            }
        } catch (Exception e) {
            log.error("❌ Lỗi xử lý VNPay return: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Lỗi hệ thống: " + e.getMessage()));
        }
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

            log.info("📨 VNPay IPN - TxnRef: {}, ResponseCode: {}", 
                    vnpParams.get("vnp_TxnRef"), vnpParams.get("vnp_ResponseCode"));

            // Xử lý callback
            boolean success = vnPayService.handlePaymentCallback(vnpParams);
            
            if (success) {
                return ResponseEntity.ok(PaymentCallbackResponse.success());
            } else {
                return ResponseEntity.ok(PaymentCallbackResponse.error("Invalid signature"));
            }
        } catch (Exception e) {
            log.error("❌ Lỗi xử lý VNPay IPN: {}", e.getMessage());
            return ResponseEntity.ok(PaymentCallbackResponse.error("System error"));
        }
    }

    /**
     * API kiểm tra trạng thái thanh toán của order
     * GET /api/payment/status/{orderId}
     */
    @GetMapping("/status/{orderId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> checkPaymentStatus(@PathVariable Long orderId) {
        // TODO: Implement check payment status
        return ResponseEntity.ok(new MessageResponse("Coming soon"));
    }
}

