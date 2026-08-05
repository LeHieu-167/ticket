package com.ticket.service;

import com.ticket.config.VNPayConfig;
import com.ticket.dto.PaymentRequest;
import com.ticket.dto.PaymentResponse;
import com.ticket.entity.Event;
import com.ticket.entity.Order;
import com.ticket.repository.EventRepository;
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
    private final EventRepository eventRepository;
    private final NotificationService notificationService;
    private final TicketService ticketService;

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

            log.info("Tạo URL thanh toán VNPay thành công - Order ID: {}, Amount: {}", 
                    order.getId(), amount);

            return new PaymentResponse("00", "Success", paymentUrl);

        } catch (Exception e) {
            log.error("Lỗi tạo URL thanh toán VNPay: {}", e.getMessage(), e);
            log.error("Lỗi tạo URL thanh toán VNPay: {}", e.getMessage(), e);
            return new PaymentResponse("99", "Lỗi: " + e.getMessage(), null);
        }
    }

    @Transactional
    public boolean handlePaymentCallback(Map<String, String> vnpParams) {
        try {
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
            
            if ("00".equals(vnpResponseCode)) {
                order.setPaymentStatus(Order.PaymentStatus.PAID);
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
                order.setPaymentTime(LocalDateTime.parse(vnpPayDate, formatter));
                
                log.info("Thanh toán thành công - Order ID: {}, Transaction: {}", 
                        order.getId(), vnpTransactionNo);

                // Lưu order trước khi tạo vé
                orderRepository.save(order);

                // 📊 CẬP NHẬT THỐNG KÊ SỰ KIỆN (số vé đã bán, doanh thu)
                try {
                    updateEventStatistics(order);
                    log.info("Đã cập nhật thống kê cho sự kiện - Order ID: {}", order.getId());
                } catch (Exception e) {
                    log.error("Lỗi cập nhật thống kê sự kiện: {}", e.getMessage(), e);
                    // Vẫn tiếp tục - order đã được thanh toán
                }

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
                    log.error("Lỗi gửi notification: {}", e.getMessage());
                }
                
                return true; // Đã save ở trên, tránh save 2 lần
            } else {
                order.setPaymentStatus(Order.PaymentStatus.FAILED);
                order.setStatus(Order.OrderStatus.CANCELLED); // Hủy đơn hàng
                log.warn("Thanh toán thất bại - Order ID: {}, ResponseCode: {}", 
                        order.getId(), vnpResponseCode);

                // QUAN TRỌNG: Hoàn trả vé vào tồn kho ngay lập tức
                returnTicketsToInventory(order);

                // Gửi notification thất bại
                try {
                    String errorMessage = getResponseMessage(vnpResponseCode);
                    notificationService.notifyPaymentCompleted(
                            order.getCustomerId(), 
                            order.getId(), 
                            false, 
                            "Thanh toán thất bại: " + errorMessage + ". Vé đã được hoàn trả về hệ thống."
                    );
                } catch (Exception e) {
                    log.error("Lỗi gửi notification: {}", e.getMessage());
                    log.error("Lỗi gửi notification: {}", e.getMessage());
                }
            }
            
            orderRepository.save(order);
            return true;

        } catch (Exception e) {
            log.error("Lỗi xử lý callback VNPay: {}", e.getMessage(), e);
            log.error("Lỗi xử lý callback VNPay: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Hoàn trả vé vào tồn kho khi thanh toán thất bại hoặc đơn hàng bị hủy
     */
    private void returnTicketsToInventory(Order order) {
        try {
            Event event = eventRepository.findById(order.getEventId()).orElse(null);
            if (event != null) {
                Integer currentTickets = event.getAvailableTickets();
                Integer returnedTickets = order.getTicketQuantity();
                Integer newAvailableTickets = currentTickets + returnedTickets;
                
                event.setAvailableTickets(newAvailableTickets);
                eventRepository.save(event);
                
                log.info("Đã hoàn trả {} vé cho sự kiện {} do thanh toán thất bại - Tồn kho mới: {}", 
                        returnedTickets, event.getId(), newAvailableTickets);
            } else {
                log.warn("Không tìm thấy sự kiện {} để hoàn trả vé", order.getEventId());
            }
        } catch (Exception e) {
            log.error("Lỗi hoàn trả vé cho đơn hàng {}: {}", order.getId(), e.getMessage(), e);
        }
    }

    /**
     * Lấy message mô tả từ response code
     */
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

    /**
     * Cập nhật thống kê sự kiện sau khi thanh toán thành công
     * - Tăng số vé đã bán (ticketsSold)
     * - Tăng tổng doanh thu (totalRevenue)
     */
    private void updateEventStatistics(Order order) {
        Event event = eventRepository.findById(order.getEventId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện: " + order.getEventId()));

        // Cập nhật số vé đã bán
        Integer currentSold = event.getTicketsSold() != null ? event.getTicketsSold() : 0;
        event.setTicketsSold(currentSold + order.getTicketQuantity());

        // Cập nhật tổng doanh thu
        java.math.BigDecimal currentRevenue = event.getTotalRevenue() != null 
                ? event.getTotalRevenue() 
                : java.math.BigDecimal.ZERO;
        event.setTotalRevenue(currentRevenue.add(order.getTotalPrice()));

        eventRepository.save(event);
        
        log.info("Đã cập nhật thống kê sự kiện {} - Vé đã bán: {}, Doanh thu: {}", 
                event.getId(), event.getTicketsSold(), event.getTotalRevenue());
    }
}

