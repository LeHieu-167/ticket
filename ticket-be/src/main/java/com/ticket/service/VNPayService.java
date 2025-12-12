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

    public PaymentResponse createPaymentUrl(PaymentRequest paymentRequest, HttpServletRequest request) {
        try {
            Order order = orderRepository.findById(paymentRequest.getOrderId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng"));

            if (order.getStatus() != Order.OrderStatus.CONFIRMED) {
                return new PaymentResponse("01", "Đơn hàng chưa được xác nhận", null);
            }

            if (order.getPaymentStatus() == Order.PaymentStatus.PAID) {
                return new PaymentResponse("02", "Đơn hàng đã được thanh toán", null);
            }

            Map<String, String> vnpParams = new HashMap<>();
            vnpParams.put("vnp_Version", vnPayConfig.getVnpVersion());
            vnpParams.put("vnp_Command", vnPayConfig.getVnpCommand());
            vnpParams.put("vnp_TmnCode", vnPayConfig.getVnpTmnCode());
            
            long amount = order.getTotalPrice().longValue() * 100;
            vnpParams.put("vnp_Amount", String.valueOf(amount));
            vnpParams.put("vnp_CurrCode", "VND");
            
            if (paymentRequest.getBankCode() != null && !paymentRequest.getBankCode().isEmpty()) {
                vnpParams.put("vnp_BankCode", paymentRequest.getBankCode());
            }
            
            String orderIdShort = order.getId().toString().substring(0, 8).toUpperCase();
            String vnpTxnRef = "ORDER" + orderIdShort + "_" + System.currentTimeMillis();
            vnpParams.put("vnp_TxnRef", vnpTxnRef);
            
            String orderInfo = "Thanh toan ve su kien - Don hang " + orderIdShort;
            vnpParams.put("vnp_OrderInfo", orderInfo);
            vnpParams.put("vnp_OrderType", vnPayConfig.getVnpOrderType());
            
            String locale = paymentRequest.getLanguage() != null && paymentRequest.getLanguage().equals("en") ? "en" : "vn";
            vnpParams.put("vnp_Locale", locale);
            vnpParams.put("vnp_ReturnUrl", vnPayConfig.getVnpReturnUrl());
            vnpParams.put("vnp_IpAddr", VNPayUtil.getIpAddress(request));
            
            Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Etc/GMT+7"));
            SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
            String vnpCreateDate = formatter.format(cld.getTime());
            vnpParams.put("vnp_CreateDate", vnpCreateDate);
            
            cld.add(Calendar.MINUTE, 15);
            String vnpExpireDate = formatter.format(cld.getTime());
            vnpParams.put("vnp_ExpireDate", vnpExpireDate);

            List<String> fieldNames = new ArrayList<>(vnpParams.keySet());
            Collections.sort(fieldNames);
            
            StringBuilder hashData = new StringBuilder();
            StringBuilder query = new StringBuilder();
            
            Iterator<String> itr = fieldNames.iterator();
            while (itr.hasNext()) {
                String fieldName = itr.next();
                String fieldValue = vnpParams.get(fieldName);
                if ((fieldValue != null) && (fieldValue.length() > 0)) {
                    hashData.append(fieldName);
                    hashData.append('=');
                    hashData.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));
                    
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

            order.setPaymentTransactionId(vnpTxnRef);
            order.setPaymentMethod("VNPAY");
            orderRepository.save(order);

            log.info("Tạo URL thanh toán VNPay thành công - Order ID: {}, Amount: {}", order.getId(), amount);

            return new PaymentResponse("00", "Success", paymentUrl);

        } catch (Exception e) {
            log.error("Lỗi tạo URL thanh toán VNPay: {}", e.getMessage(), e);
            return new PaymentResponse("99", "Lỗi: " + e.getMessage(), null);
        }
    }

    @Transactional
    public boolean handlePaymentCallback(Map<String, String> vnpParams) {
        try {
            String vnpSecureHash = vnpParams.get("vnp_SecureHash");
            vnpParams.remove("vnp_SecureHash");
            vnpParams.remove("vnp_SecureHashType");
            
            String signValue = VNPayUtil.hashAllFields(vnpParams);
            String calculatedHash = VNPayUtil.hmacSHA512(vnPayConfig.getVnpSecretKey(), signValue);
            
            if (!calculatedHash.equals(vnpSecureHash)) {
                log.error("Invalid VNPay signature");
                return false;
            }
            
            String vnpTxnRef = vnpParams.get("vnp_TxnRef");
            String vnpResponseCode = vnpParams.get("vnp_ResponseCode");
            String vnpTransactionNo = vnpParams.get("vnp_TransactionNo");
            String vnpPayDate = vnpParams.get("vnp_PayDate");
            
            log.info("Nhận callback từ VNPay - TxnRef: {}, ResponseCode: {}", vnpTxnRef, vnpResponseCode);
            
            Order order = orderRepository.findByPaymentTransactionId(vnpTxnRef)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng với TxnRef: " + vnpTxnRef));
            
            if ("00".equals(vnpResponseCode)) {
                order.setPaymentStatus(Order.PaymentStatus.PAID);
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
                order.setPaymentTime(LocalDateTime.parse(vnpPayDate, formatter));
                
                log.info("Thanh toán thành công - Order ID: {}, Transaction: {}", order.getId(), vnpTransactionNo);

                try {
                    String message = String.format(
                            "Thanh toán đơn hàng #%s thành công! Số tiền: %,d VND. Mã giao dịch: %s",
                            order.getId().toString().substring(0, 8), order.getTotalPrice().longValue(), vnpTransactionNo
                    );
                    notificationService.notifyPaymentCompleted(order.getCustomerId(), order.getId(), true, message);
                } catch (Exception e) {
                    log.error("Lỗi gửi notification: {}", e.getMessage());
                }
            } else {
                order.setPaymentStatus(Order.PaymentStatus.FAILED);
                log.warn("Thanh toán thất bại - Order ID: {}, ResponseCode: {}", order.getId(), vnpResponseCode);

                try {
                    String errorMessage = getResponseMessage(vnpResponseCode);
                    notificationService.notifyPaymentCompleted(order.getCustomerId(), order.getId(), false, "Thanh toán thất bại: " + errorMessage);
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

    public String getResponseMessage(String responseCode) {
        return switch (responseCode) {
            case "00" -> "Giao dịch thành công";
            case "07" -> "Trừ tiền thành công. Giao dịch bị nghi ngờ.";
            case "09" -> "Thẻ/Tài khoản chưa đăng ký InternetBanking.";
            case "10" -> "Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần";
            case "11" -> "Đã hết hạn chờ thanh toán.";
            case "12" -> "Thẻ/Tài khoản bị khóa.";
            case "13" -> "Nhập sai mật khẩu OTP.";
            case "24" -> "Khách hàng hủy giao dịch";
            case "51" -> "Tài khoản không đủ số dư.";
            case "65" -> "Tài khoản đã vượt quá hạn mức giao dịch trong ngày.";
            case "75" -> "Ngân hàng đang bảo trì.";
            case "79" -> "Nhập sai mật khẩu thanh toán quá số lần quy định.";
            default -> "Giao dịch thất bại";
        };
    }
}
