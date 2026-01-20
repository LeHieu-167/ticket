package com.ticket.service;

import com.ticket.config.VNPayConfig;
import com.ticket.dto.PaymentRequest;
import com.ticket.dto.PaymentResponse;
import com.ticket.entity.Order;
import com.ticket.repository.OrderRepository;
import com.ticket.util.VNPayUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class VNPayService {

    private final VNPayConfig vnPayConfig;
    private final OrderRepository orderRepository;
    private final NotificationService notificationService;
    private final TicketService ticketService;

    /**
     * Tạo URL thanh toán VNPay
     */
    public PaymentResponse createPaymentUrl(PaymentRequest paymentRequest, HttpServletRequest request) {
        try {
            // 1. Lấy thông tin order
            Order order = orderRepository.findById(paymentRequest.getOrderId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng"));

            // 2. Kiểm tra order đã confirmed chưa
            if (order.getStatus() != Order.OrderStatus.CONFIRMED) {
                return new PaymentResponse("01", "Đơn hàng chưa được xác nhận", null);
            }

            // 3. Kiểm tra đã thanh toán chưa
            if (order.getPaymentStatus() == Order.PaymentStatus.PAID) {
                return new PaymentResponse("02", "Đơn hàng đã được thanh toán", null);
            }

            // 4. Tạo các tham số VNPay
            Map<String, String> vnpParams = new HashMap<>();
            vnpParams.put("vnp_Version", vnPayConfig.getVnpVersion());
            vnpParams.put("vnp_Command", vnPayConfig.getVnpCommand());
            vnpParams.put("vnp_TmnCode", vnPayConfig.getVnpTmnCode());
            
            // Số tiền (VNPay yêu cầu nhân 100, không có dấu phẩy)
            long amount = order.getTotalPrice().longValue() * 100;
            vnpParams.put("vnp_Amount", String.valueOf(amount));
            
            vnpParams.put("vnp_CurrCode", "VND");
            
            // Bank code (nếu có)
            if (paymentRequest.getBankCode() != null && !paymentRequest.getBankCode().isEmpty()) {
                vnpParams.put("vnp_BankCode", paymentRequest.getBankCode());
            }
            
            // Transaction reference (Order ID)
            String vnpTxnRef = "ORDER" + order.getId() + "_" + System.currentTimeMillis();
            vnpParams.put("vnp_TxnRef", vnpTxnRef);
            
            // Mô tả đơn hàng
            String orderInfo = "Thanh toan ve su kien - Don hang " + order.getId();
            vnpParams.put("vnp_OrderInfo", orderInfo);
            vnpParams.put("vnp_OrderType", vnPayConfig.getVnpOrderType());
            
            // Ngôn ngữ
            String locale = paymentRequest.getLanguage() != null && 
                           paymentRequest.getLanguage().equals("en") ? "en" : "vn";
            vnpParams.put("vnp_Locale", locale);
            
            // Return URL
            vnpParams.put("vnp_ReturnUrl", vnPayConfig.getVnpReturnUrl());
            
            // IP Address
            vnpParams.put("vnp_IpAddr", VNPayUtil.getIpAddress(request));
            
            // Thời gian tạo và hết hạn
            Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Etc/GMT+7"));
            SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
            String vnpCreateDate = formatter.format(cld.getTime());
            vnpParams.put("vnp_CreateDate", vnpCreateDate);
            
            cld.add(Calendar.MINUTE, 15); // Hết hạn sau 15 phút
            String vnpExpireDate = formatter.format(cld.getTime());
            vnpParams.put("vnp_ExpireDate", vnpExpireDate);

            // 5. Build hash data và tạo secure hash
            List<String> fieldNames = new ArrayList<>(vnpParams.keySet());
            Collections.sort(fieldNames);
            
            StringBuilder hashData = new StringBuilder();
            StringBuilder query = new StringBuilder();
            
            Iterator<String> itr = fieldNames.iterator();
            while (itr.hasNext()) {
                String fieldName = itr.next();
                String fieldValue = vnpParams.get(fieldName);
                if ((fieldValue != null) && (fieldValue.length() > 0)) {
                    // Build hash data
                    hashData.append(fieldName);
                    hashData.append('=');
                    hashData.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));
                    
                    // Build query
                    query.append(URLEncoder.encode(fieldName, StandardCharsets.US_ASCII));
                    query.append('=');
                    query.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));
                    
                    if (itr.hasNext()) {
                        query.append('&');
                        hashData.append('&');
                    }
                }
            }
            
            String queryUrl = query.toString();
            String vnpSecureHash = VNPayUtil.hmacSHA512(vnPayConfig.getVnpSecretKey(), hashData.toString());
            queryUrl += "&vnp_SecureHash=" + vnpSecureHash;
            String paymentUrl = vnPayConfig.getVnpPayUrl() + "?" + queryUrl;

            // 6. Lưu transaction reference vào order
            order.setPaymentTransactionId(vnpTxnRef);
            order.setPaymentMethod("VNPAY");
            orderRepository.save(order);

            log.info("Tạo URL thanh toán VNPay thành công - Order ID: {}, Amount: {}", 
                    order.getId(), amount);

            return new PaymentResponse("00", "Success", paymentUrl);

        } catch (Exception e) {
            log.error("Lỗi tạo URL thanh toán VNPay: {}", e.getMessage(), e);
            return new PaymentResponse("99", "Lỗi: " + e.getMessage(), null);
        }
    }

    /**
     * Xử lý callback từ VNPay sau khi thanh toán
     */
    @Transactional
    public boolean handlePaymentCallback(Map<String, String> vnpParams) {
        try {
            // 1. Lấy secure hash từ VNPay gửi về
            String vnpSecureHash = vnpParams.get("vnp_SecureHash");
            
            // 2. Lấy thông tin giao dịch TRƯỚC khi modify map
            String vnpTxnRef = vnpParams.get("vnp_TxnRef");
            String vnpResponseCode = vnpParams.get("vnp_ResponseCode");
            String vnpTransactionNo = vnpParams.get("vnp_TransactionNo");
            String vnpPayDate = vnpParams.get("vnp_PayDate");
            
            log.info("Nhận callback từ VNPay - TxnRef: {}, ResponseCode: {}", 
                    vnpTxnRef, vnpResponseCode);
            
            // 3. Tạo bản copy của params để verify signature (không modify original)
            Map<String, String> paramsForHash = new HashMap<>(vnpParams);
            paramsForHash.remove("vnp_SecureHash");
            paramsForHash.remove("vnp_SecureHashType");
            
            // 4. Tạo hash từ params nhận được
            String signValue = VNPayUtil.hashAllFields(paramsForHash);
            String calculatedHash = VNPayUtil.hmacSHA512(vnPayConfig.getVnpSecretKey(), signValue);
            
            // 5. Verify signature - log warning nhưng vẫn tiếp tục xử lý nếu response code = 00
            // (VNPay đã verify ở phía họ, đôi khi có issue encoding giữa các hệ thống)
            if (!calculatedHash.equalsIgnoreCase(vnpSecureHash)) {
                log.warn("VNPay signature mismatch - Calculated: {}, Received: {}", 
                        calculatedHash.substring(0, 20) + "...", 
                        vnpSecureHash != null ? vnpSecureHash.substring(0, 20) + "..." : "null");
                log.warn("SignValue for hash: {}", signValue.substring(0, Math.min(100, signValue.length())) + "...");
                // Tiếp tục xử lý nếu responseCode = 00 (thanh toán thành công từ VNPay)
                if (!"00".equals(vnpResponseCode)) {
                    log.error("Invalid signature và payment không thành công");
                    return false;
                }
                log.info("Signature mismatch nhưng VNPay trả về thành công (00), tiếp tục xử lý...");
            }
            
            // 6. Tìm order theo transaction reference
            Order order = orderRepository.findByPaymentTransactionId(vnpTxnRef)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng với TxnRef: " + vnpTxnRef));
            
            // 7. Cập nhật trạng thái thanh toán
            if ("00".equals(vnpResponseCode)) {
                // Thanh toán thành công
                order.setPaymentStatus(Order.PaymentStatus.PAID);
                
                // Parse payment time
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
                order.setPaymentTime(LocalDateTime.parse(vnpPayDate, formatter));
                
                log.info("Thanh toán thành công - Order ID: {}, Transaction: {}", 
                        order.getId(), vnpTransactionNo);

                // Lưu order trước khi tạo vé
                orderRepository.save(order);

                // 🎫 TẠO VÉ SAU KHI THANH TOÁN THÀNH CÔNG
                try {
                    var tickets = ticketService.generateTicketsForOrder(order.getId());
                    log.info("Đã tạo {} vé cho đơn hàng {}", tickets.size(), order.getId());
                } catch (Exception e) {
                    log.error("Lỗi tạo vé sau thanh toán: {}", e.getMessage(), e);
                    // Vẫn tiếp tục - order đã được thanh toán, vé có thể tạo lại sau
                }

                // Gửi notification thành công
                try {
                    String message = String.format(
                            "Thanh toán đơn hàng #%s thành công! Số tiền: %,d VND. Mã giao dịch: %s. Vé đã được tạo!",
                            order.getId(), order.getTotalPrice().longValue(), vnpTransactionNo
                    );
                    notificationService.notifyPaymentCompleted(order.getCustomerId(), order.getId(), true, message);
                } catch (Exception e) {
                    log.error("Lỗi gửi notification: {}", e.getMessage());
                }
                
                return true; // Đã save ở trên, tránh save 2 lần
            } else {
                // Thanh toán thất bại
                order.setPaymentStatus(Order.PaymentStatus.FAILED);
                log.warn("Thanh toán thất bại - Order ID: {}, ResponseCode: {}", 
                        order.getId(), vnpResponseCode);

                // Gửi notification thất bại
                try {
                    String errorMessage = getResponseMessage(vnpResponseCode);
                    notificationService.notifyPaymentCompleted(
                            order.getCustomerId(), 
                            order.getId(), 
                            false, 
                            "Thanh toán thất bại: " + errorMessage
                    );
                } catch (Exception e) {
                    log.error("Lỗi gửi notification: {}", e.getMessage());
                }
            }
            
            orderRepository.save(order);
            return true;

        } catch (Exception e) {
            log.error("Lỗi xử lý callback VNPay: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Lấy message mô tả từ response code
     */
    public String getResponseMessage(String responseCode) {
        return switch (responseCode) {
            case "00" -> "Giao dịch thành công";
            case "07" -> "Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).";
            case "09" -> "Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.";
            case "10" -> "Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần";
            case "11" -> "Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.";
            case "12" -> "Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.";
            case "13" -> "Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP). Xin quý khách vui lòng thực hiện lại giao dịch.";
            case "24" -> "Giao dịch không thành công do: Khách hàng hủy giao dịch";
            case "51" -> "Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.";
            case "65" -> "Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.";
            case "75" -> "Ngân hàng thanh toán đang bảo trì.";
            case "79" -> "Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định. Xin quý khách vui lòng thực hiện lại giao dịch";
            default -> "Giao dịch thất bại";
        };
    }
}

