package com.ticket.controller;

import com.ticket.dto.UserResponse;
import com.ticket.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UserController {
    
    private final UserService userService;

    /**
     * API cho Admin xem tất cả người dùng
     * GET /api/admin/users
     */
    @GetMapping("/admin/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        List<UserResponse> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    /**
     * API cho người dùng xem thông tin của chính mình
     * GET /api/users/me
     */
    @GetMapping("/users/me")
    @PreAuthorize("hasRole('CUSTOMER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<UserResponse> getCurrentUser(Authentication authentication) {
        String username = authentication.getName();
        UserResponse user = userService.getUserByUsername(username);
        return ResponseEntity.ok(user);
    }

    /**
     * API cho Admin xem chi tiết một người dùng cụ thể
     * GET /api/admin/users/{id}
     */
    @GetMapping("/admin/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        UserResponse user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }
}

