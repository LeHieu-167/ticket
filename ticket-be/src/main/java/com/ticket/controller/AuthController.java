package com.ticket.controller;

import com.ticket.dto.*;
import com.ticket.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    /**
     * API đăng nhập
     * POST /auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            JwtResponse jwtResponse = authService.login(loginRequest);
            return ResponseEntity.ok(jwtResponse);
        } catch (Exception e) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Đăng nhập thất bại: " + e.getMessage()));
        }
    }

    /**
     * API đăng ký cho Khách hàng (CUSTOMER)
     * POST /auth/register/customer
     */
    @PostMapping("/register/customer")
    public ResponseEntity<?> registerCustomer(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            authService.registerCustomer(registerRequest);
            return ResponseEntity.ok(new MessageResponse("Đăng ký tài khoản Khách hàng thành công!"));
        } catch (RuntimeException e) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * API đăng ký cho Nhà tổ chức (ORGANIZER)
     * POST /auth/register/organizer
     */
    @PostMapping("/register/organizer")
    public ResponseEntity<?> registerOrganizer(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            authService.registerOrganizer(registerRequest);
            return ResponseEntity.ok(new MessageResponse("Đăng ký tài khoản Nhà tổ chức thành công!"));
        } catch (RuntimeException e) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * API đăng ký cho Admin (ADMIN)
     * POST /auth/register/admin
     * Lưu ý: Trong production, endpoint này nên được bảo vệ hoặc xóa bỏ
     */
    @PostMapping("/register/admin")
    public ResponseEntity<?> registerAdmin(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            authService.registerAdmin(registerRequest);
            return ResponseEntity.ok(new MessageResponse("Đăng ký tài khoản Admin thành công!"));
        } catch (RuntimeException e) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * API làm mới token (Refresh Token)
     * POST /auth/refresh-token
     * 
     * Khi Access Token hết hạn, frontend gọi API này với Refresh Token
     * để lấy cặp token mới (Access Token + Refresh Token mới)
     */
    @PostMapping("/refresh-token")
    public ResponseEntity<?> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        try {
            JwtResponse jwtResponse = authService.refreshToken(request.getRefreshToken());
            return ResponseEntity.ok(jwtResponse);
        } catch (RuntimeException e) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Refresh token không hợp lệ: " + e.getMessage()));
        }
    }

    /**
     * API đăng xuất (Logout)
     * POST /auth/logout
     * 
     * Logic:
     * 1. Lấy Access Token từ header
     * 2. Thêm Access Token vào Blacklist (Redis) với TTL = thời gian còn lại
     * 3. Xóa Refresh Token khỏi Redis
     * 
     * Sau khi logout, Access Token cũ sẽ không thể sử dụng được nữa
     * (dù chưa hết hạn) vì đã bị blacklist
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, @RequestBody(required = false) LogoutRequest logoutRequest) {
        try {
            // Lấy Access Token từ Authorization header
            String accessToken = parseJwt(request);
            
            if (accessToken == null) {
                return ResponseEntity
                        .badRequest()
                        .body(new MessageResponse("Không tìm thấy Access Token trong header!"));
            }
            
            // Lấy Refresh Token từ request body (nếu có)
            String refreshToken = null;
            boolean logoutAll = false;
            
            if (logoutRequest != null) {
                refreshToken = logoutRequest.getRefreshToken();
                logoutAll = logoutRequest.isLogoutAll();
            }
            
            // Thực hiện logout
            authService.logout(accessToken, refreshToken, logoutAll);
            
            String message = logoutAll ? 
                    "Đăng xuất thành công khỏi tất cả thiết bị!" : 
                    "Đăng xuất thành công!";
            
            return ResponseEntity.ok(new MessageResponse(message));
        } catch (Exception e) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Đăng xuất thất bại: " + e.getMessage()));
        }
    }

    /**
     * Helper method: Lấy JWT token từ Authorization header
     */
    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");

        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }

        return null;
    }
}

