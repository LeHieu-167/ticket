package com.ticket.dto;

import lombok.Data;

@Data
public class LogoutRequest {

    private String refreshToken;
    
    // Option: logout khỏi tất cả thiết bị
    private boolean logoutAll = false;
}

