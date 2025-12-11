package com.ticket.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class JwtResponse {
    private String accessToken;
    private String refreshToken;
    private String type = "Bearer";
    private Long id;
    private String username;
    private String email;
    private List<String> roles;

    public JwtResponse(String accessToken, String refreshToken, Long id, String username, String email, List<String> roles) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.id = id;
        this.username = username;
        this.email = email;
        this.roles = roles;
    }

    // Constructor cũ để tương thích ngược (deprecated)
    @Deprecated
    public JwtResponse(String token, Long id, String username, String email, List<String> roles) {
        this.accessToken = token;
        this.refreshToken = null;
        this.id = id;
        this.username = username;
        this.email = email;
        this.roles = roles;
    }
}

