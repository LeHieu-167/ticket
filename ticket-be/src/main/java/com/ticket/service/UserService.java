package com.ticket.service;

import com.ticket.dto.UpdateProfileRequest;
import com.ticket.dto.UserResponse;
import com.ticket.entity.User;
import com.ticket.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {
    
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        List<User> users = userRepository.findAll();
        return users.stream()
                .map(UserResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + userId));
        return UserResponse.fromEntity(user);
    }

    @Transactional(readOnly = true)
    public UserResponse getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với username: " + username));
        return UserResponse.fromEntity(user);
    }

    @Transactional
    public UserResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + userId));

        // Chỉ cập nhật nếu user có gửi dữ liệu (khác null)
        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (request.getPhoneNumber() != null) user.setPhoneNumber(request.getPhoneNumber());
        if (request.getAddress() != null) user.setAddress(request.getAddress());
        if (request.getAvatarUrl() != null) user.setAvatarUrl(request.getAvatarUrl());

        User updatedUser = userRepository.save(user);
        return UserResponse.fromEntity(updatedUser);
    }

    /**
     * Chặn tài khoản người dùng (Admin only)
     * Set isActive = false
     */
    @Transactional
    public UserResponse blockUser(UUID userId, UUID adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + userId));

        // Không cho phép Admin tự chặn chính mình
        if (userId.equals(adminId)) {
            throw new RuntimeException("Không thể tự chặn tài khoản của chính mình!");
        }

        // Kiểm tra nếu user là Admin thì không cho phép chặn
        boolean isTargetAdmin = user.getRoles().stream()
                .anyMatch(role -> role.getName().name().equals("ROLE_ADMIN"));
        if (isTargetAdmin) {
            throw new RuntimeException("Không thể chặn tài khoản Admin khác!");
        }

        user.setActive(false);
        User updatedUser = userRepository.save(user);
        return UserResponse.fromEntity(updatedUser);
    }

    /**
     * Mở chặn tài khoản người dùng (Admin only)
     * Set isActive = true
     */
    @Transactional
    public UserResponse unblockUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + userId));

        user.setActive(true);
        User updatedUser = userRepository.save(user);
        return UserResponse.fromEntity(updatedUser);
    }

    /**
     * Xóa tài khoản người dùng (Admin only)
     * Chỉ có thể xóa tài khoản đã bị chặn (isActive = false)
     */
    @Transactional
    public void deleteUser(UUID userId, UUID adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + userId));

        // Không cho phép Admin tự xóa chính mình
        if (userId.equals(adminId)) {
            throw new RuntimeException("Không thể tự xóa tài khoản của chính mình!");
        }

        // Kiểm tra nếu user là Admin thì không cho phép xóa
        boolean isTargetAdmin = user.getRoles().stream()
                .anyMatch(role -> role.getName().name().equals("ROLE_ADMIN"));
        if (isTargetAdmin) {
            throw new RuntimeException("Không thể xóa tài khoản Admin khác!");
        }

        // Chỉ cho phép xóa tài khoản đã bị chặn
        if (user.isActive()) {
            throw new RuntimeException("Chỉ có thể xóa tài khoản đã bị chặn! Vui lòng chặn tài khoản trước.");
        }

        userRepository.delete(user);
    }

    /**
     * Lấy UUID của user từ username
     * Dùng cho beacon-cancel endpoint
     * 
     * @param username Username của user
     * @return UUID của user hoặc null nếu không tìm thấy
     */
    @Transactional(readOnly = true)
    public UUID getUserIdByUsername(String username) {
        return userRepository.findByUsername(username)
                .map(User::getId)
                .orElse(null);
    }
}
