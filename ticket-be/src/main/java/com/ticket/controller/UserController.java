package com.ticket.controller;

import com.ticket.dto.MessageResponse;
import com.ticket.dto.UpdateProfileRequest;
import com.ticket.dto.UserResponse;
import com.ticket.security.UserDetailsImpl;
import com.ticket.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UserController {
    
    private final UserService userService;

    // Helper lấy ID từ Token
    private UUID getCurrentUserId() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return userDetails.getId();
    }

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

    @GetMapping("/users/me")
    @PreAuthorize("hasRole('CUSTOMER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<UserResponse> getCurrentUser(Authentication authentication) {
        String username = authentication.getName();
        UserResponse user = userService.getUserByUsername(username);
        return ResponseEntity.ok(user);
    }

    /**
     * API lấy thông tin profile hiện tại (để điền sẵn vào form)
     * GET /api/users/profile
     */
    @GetMapping("/users/profile")
    @PreAuthorize("hasRole('CUSTOMER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<UserResponse> getMyProfile() {
        UUID userId = getCurrentUserId();
        return ResponseEntity.ok(userService.getUserById(userId));
    }

    /**
     * API cập nhật profile của người dùng
     * PUT /api/users/profile
     */
    @PutMapping("/users/profile")
    @PreAuthorize("hasRole('CUSTOMER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<UserResponse> updateProfile(@RequestBody UpdateProfileRequest request) {
        UUID userId = getCurrentUserId();
        return ResponseEntity.ok(userService.updateProfile(userId, request));
    }

    /**
     * API cho Admin xem chi tiết một người dùng cụ thể
     * GET /api/admin/users/{id}
     */
    @GetMapping("/admin/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> getUserById(@PathVariable UUID id) {

        UserResponse user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }

    /**
     * API cho Admin chặn tài khoản người dùng
     * PUT /api/admin/users/{id}/block
     */
    @PutMapping("/admin/users/{id}/block")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> blockUser(@PathVariable UUID id) {
        try {
            UUID adminId = getCurrentUserId();
            UserResponse user = userService.blockUser(id, adminId);
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * API cho Admin mở chặn tài khoản người dùng
     * PUT /api/admin/users/{id}/unblock
     */
    @PutMapping("/admin/users/{id}/unblock")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> unblockUser(@PathVariable UUID id) {
        try {
            UserResponse user = userService.unblockUser(id);
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * API cho Admin xóa tài khoản người dùng (chỉ xóa được tài khoản đã bị chặn)
     * DELETE /api/admin/users/{id}
     */
    @DeleteMapping("/admin/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable UUID id) {
        try {
            UUID adminId = getCurrentUserId();
            userService.deleteUser(id, adminId);
            return ResponseEntity.ok(new MessageResponse("Đã xóa tài khoản thành công!"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }
}

