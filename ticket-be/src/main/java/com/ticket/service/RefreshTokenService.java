package com.ticket.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Service quản lý Refresh Token trong Redis
 * Lưu trữ mapping: refresh_token -> user_id
 */
@Service
public class RefreshTokenService {

    private static final String REFRESH_TOKEN_KEY_PREFIX = "auth:refresh_token:";
    private static final String USER_TOKENS_KEY_PREFIX = "auth:user_tokens:";

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    @Value("${jwt.refresh-token.expiration}")
    private long refreshTokenExpirationMs;

    /**
     * Tạo và lưu refresh token mới
     * @param userId ID của user
     * @return refresh token (UUID)
     */
    public String createRefreshToken(UUID userId) {
        // Tạo refresh token là UUID ngẫu nhiên
        String refreshToken = UUID.randomUUID().toString();
        
        long ttlInSeconds = refreshTokenExpirationMs / 1000;
        
        // 1. Lưu token → userId mapping
        String tokenKey = REFRESH_TOKEN_KEY_PREFIX + refreshToken;
        redisTemplate.opsForValue().set(tokenKey, userId.toString(), ttlInSeconds, TimeUnit.SECONDS);
        
        // 2. Thêm token vào Set của user (Reverse Index)
        // ✅ O(1) operation - Không cần scan!
        String userTokensKey = USER_TOKENS_KEY_PREFIX + userId;
        redisTemplate.opsForSet().add(userTokensKey, refreshToken);
        
        // 3. Set TTL cho Set (tự động clean up)
        redisTemplate.expire(userTokensKey, ttlInSeconds, TimeUnit.SECONDS);
        
        return refreshToken;
    }

    /**
     * Verify và lấy userId từ refresh token
     * @param refreshToken Refresh token cần verify
     * @return userId nếu token hợp lệ, null nếu không hợp lệ hoặc hết hạn
     */
    public UUID verifyRefreshToken(String refreshToken) {
        String key = REFRESH_TOKEN_KEY_PREFIX + refreshToken;
        String userId = redisTemplate.opsForValue().get(key);
        
        if (userId != null) {
            return UUID.fromString(userId);
        }
        
        return null;
    }

    /**
     * Xóa refresh token (dùng khi logout hoặc rotate token)
     * @param refreshToken Refresh token cần xóa
     */
    public void deleteRefreshToken(String refreshToken) {
        // 1. Lấy userId trước khi xóa
        UUID userId = verifyRefreshToken(refreshToken);

        // 2. Xóa token
        String tokenKey = REFRESH_TOKEN_KEY_PREFIX + refreshToken;
        redisTemplate.delete(tokenKey);
        
        // 3. Xóa khỏi Set của user (nếu có)
        if (userId != null) {
            String userTokensKey = USER_TOKENS_KEY_PREFIX + userId;
            redisTemplate.opsForSet().remove(userTokensKey, refreshToken);
        }
    }

    /**
     * Xóa tất cả refresh token của user (logout khỏi tất cả thiết bị)
     * Dùng Reverse Index - O(M) với M = số tokens của user (thường < 10)
     * Thay vì O(N) với N = tổng số tokens trong Redis (có thể hàng triệu)
     * 
     * @param userId ID của user
     */
    public void deleteAllRefreshTokensOfUser(UUID userId) {
        String userTokensKey = USER_TOKENS_KEY_PREFIX + userId;
        
        // Lấy tất cả tokens của user từ Set - O(M) với M = số tokens của user
        Set<String> tokens = redisTemplate.opsForSet().members(userTokensKey);
        
        if (tokens != null && !tokens.isEmpty()) {
            // Xóa từng token
            tokens.forEach(token -> {
                String tokenKey = REFRESH_TOKEN_KEY_PREFIX + token;
                redisTemplate.delete(tokenKey);
            });
            
            // Xóa Set của user
            redisTemplate.delete(userTokensKey);
        }
    }

    /**
     * Rotate refresh token: Xóa token cũ và tạo token mới
     * @param oldRefreshToken Refresh token cũ
     * @param userId ID của user
     * @return refresh token mới
     */
    public String rotateRefreshToken(String oldRefreshToken, UUID userId) {
        // Xóa token cũ
        deleteRefreshToken(oldRefreshToken);
        
        // Tạo và trả về token mới
        return createRefreshToken(userId);
    }

    /**
     * Gia hạn refresh token (extend TTL)
     * @param refreshToken Refresh token
     */
    public void extendRefreshToken(String refreshToken) {
        String tokenKey = REFRESH_TOKEN_KEY_PREFIX + refreshToken;
        long ttlInSeconds = refreshTokenExpirationMs / 1000;
        
        // Gia hạn token
        redisTemplate.expire(tokenKey, ttlInSeconds, TimeUnit.SECONDS);
        
        // Gia hạn Set của user
        UUID userId = verifyRefreshToken(refreshToken);
        if (userId != null) {
            String userTokensKey = USER_TOKENS_KEY_PREFIX + userId;
            redisTemplate.expire(userTokensKey, ttlInSeconds, TimeUnit.SECONDS);
        }
    }

    /**
     * Lấy số lượng thiết bị đang đăng nhập (số refresh tokens active)
     * @param userId ID của user
     * @return số lượng tokens
     */
    public Long getActiveTokenCount(UUID userId) {
        String userTokensKey = USER_TOKENS_KEY_PREFIX + userId;
        return redisTemplate.opsForSet().size(userTokensKey);
    }

    /**
     * Lấy danh sách tất cả tokens của user (để track devices)
     * @param userId ID của user
     * @return Set các refresh tokens
     */
    public Set<String> getUserTokens(UUID userId) {
        String userTokensKey = USER_TOKENS_KEY_PREFIX + userId;
        return redisTemplate.opsForSet().members(userTokensKey);
    }

    /**
     * Kiểm tra user có đang đăng nhập không
     * @param userId ID của user
     * @return true nếu có ít nhất 1 token active
     */
    public boolean hasActiveSession(UUID userId) {
        Long count = getActiveTokenCount(userId);
        return count != null && count > 0;
    }
}

