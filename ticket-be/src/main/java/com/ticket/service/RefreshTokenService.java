package com.ticket.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

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
        
        String tokenKey = REFRESH_TOKEN_KEY_PREFIX + refreshToken;
        redisTemplate.opsForValue().set(tokenKey, userId.toString(), ttlInSeconds, TimeUnit.SECONDS);
        
        String userTokensKey = USER_TOKENS_KEY_PREFIX + userId.toString();
        redisTemplate.opsForSet().add(userTokensKey, refreshToken);
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

    public void deleteRefreshToken(String refreshToken) {
        // 1. Lấy userId trước khi xóa
        UUID userId = verifyRefreshToken(refreshToken);

        // 2. Xóa token
        String tokenKey = REFRESH_TOKEN_KEY_PREFIX + refreshToken;
        redisTemplate.delete(tokenKey);
        
        if (userId != null) {
            String userTokensKey = USER_TOKENS_KEY_PREFIX + userId.toString();
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
            tokens.forEach(token -> {
                String tokenKey = REFRESH_TOKEN_KEY_PREFIX + token;
                redisTemplate.delete(tokenKey);
            });
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
        return createRefreshToken(userId);
    }

    public void extendRefreshToken(String refreshToken) {
        String tokenKey = REFRESH_TOKEN_KEY_PREFIX + refreshToken;
        long ttlInSeconds = refreshTokenExpirationMs / 1000;
        
        redisTemplate.expire(tokenKey, ttlInSeconds, TimeUnit.SECONDS);
        
        // Gia hạn Set của user
        UUID userId = verifyRefreshToken(refreshToken);
        if (userId != null) {
            String userTokensKey = USER_TOKENS_KEY_PREFIX + userId.toString();
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
