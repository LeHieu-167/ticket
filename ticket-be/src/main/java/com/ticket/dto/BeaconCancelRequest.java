package com.ticket.dto;

import lombok.Data;
import java.util.UUID;

/**
 * DTO cho yêu cầu hủy đơn hàng từ navigator.sendBeacon()
 * Bao gồm JWT token để xác thực (vì sendBeacon không hỗ trợ headers)
 */
@Data
public class BeaconCancelRequest {
    /**
     * ID của đơn hàng cần hủy
     */
    private UUID orderId;
    
    /**
     * JWT Access Token để xác thực người dùng
     * (Do sendBeacon không hỗ trợ custom headers)
     */
    private String token;
}
