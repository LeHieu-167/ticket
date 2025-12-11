package com.ticket.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

/**
 * Service quản lý Token Blacklist trong Redis
 * Khi user logout, access token sẽ được thêm vào blacklist
 */
@Service
public class TokenBlacklistService {

    private static final String BLACKLIST_KEY_PREFIX = "auth:blacklist:";

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    /**
     * Thêm token vào blacklist
     * @param token Access token cần blacklist
     * @param ttlInSeconds Thời gian sống (bằng thời gian còn lại của token)
     */
    public void addToBlacklist(String token, long ttlInSeconds) {
        String key = BLACKLIST_KEY_PREFIX + token;
        // Lưu vào Redis với TTL, sau khi token hết hạn tự động xóa khỏi Redis
        redisTemplate.opsForValue().set(key, "revoked", ttlInSeconds, TimeUnit.SECONDS);
    }

    /**
     * Kiểm tra token có trong blacklist không
     * @param token Access token cần kiểm tra
     * @return true nếu token đã bị blacklist (đã logout)
     */
    public boolean isBlacklisted(String token) {
        String key = BLACKLIST_KEY_PREFIX + token;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }

    /**
     * Xóa token khỏi blacklist (thường không cần dùng vì có TTL tự động)
     * @param token Access token
     */
    public void removeFromBlacklist(String token) {
        String key = BLACKLIST_KEY_PREFIX + token;
        redisTemplate.delete(key);
    }
}

