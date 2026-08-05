package com.ticket.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;
import java.util.UUID;
import java.util.UUID;

@Data
@AllArgsConstructor
public class JwtResponse {
    private String accessToken;
    private String refreshToken;
    private String type = "Bearer";
    private UUID id;
    private UUID id;
    private String username;
    private String email;
    private List<String> roles;

    public JwtResponse(String accessToken, String refreshToken, UUID id, String username, String email, List<String> roles) {
    public JwtResponse(String accessToken, String refreshToken, UUID id, String username, String email, List<String> roles) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.id = id;
        this.username = username;
        this.email = email;
        this.roles = roles;
    }

    // Constructor cũ để tương thích ngược (deprecated)
    @Deprecated
    public JwtResponse(String token, UUID id, String username, String email, List<String> roles) {
        this.accessToken = token;
        this.refreshToken = null;
        this.id = id;
        this.username = username;
        this.email = email;
        this.roles = roles;
    }
}

