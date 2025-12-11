package com.ticket.dto;

import lombok.Data;

@Data
public class LogoutRequest {
    // Có thể để trống vì access token lấy từ header
    // Nhưng có thể thêm refresh token nếu muốn logout cả refresh token
    private String refreshToken;
    
    // Option: logout khỏi tất cả thiết bị
    private boolean logoutAll = false;
}

