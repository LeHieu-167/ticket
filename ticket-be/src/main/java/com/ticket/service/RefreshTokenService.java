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

    public String createRefreshToken(UUID userId) {
        String refreshToken = UUID.randomUUID().toString();
        long ttlInSeconds = refreshTokenExpirationMs / 1000;
        
        String tokenKey = REFRESH_TOKEN_KEY_PREFIX + refreshToken;
        redisTemplate.opsForValue().set(tokenKey, userId.toString(), ttlInSeconds, TimeUnit.SECONDS);
        
        String userTokensKey = USER_TOKENS_KEY_PREFIX + userId.toString();
        redisTemplate.opsForSet().add(userTokensKey, refreshToken);
        redisTemplate.expire(userTokensKey, ttlInSeconds, TimeUnit.SECONDS);
        
        return refreshToken;
    }

    public UUID verifyRefreshToken(String refreshToken) {
        String key = REFRESH_TOKEN_KEY_PREFIX + refreshToken;
        String userId = redisTemplate.opsForValue().get(key);
        
        if (userId != null) {
            return UUID.fromString(userId);
        }
        return null;
    }

    public void deleteRefreshToken(String refreshToken) {
        UUID userId = verifyRefreshToken(refreshToken);
        
        String tokenKey = REFRESH_TOKEN_KEY_PREFIX + refreshToken;
        redisTemplate.delete(tokenKey);
        
        if (userId != null) {
            String userTokensKey = USER_TOKENS_KEY_PREFIX + userId.toString();
            redisTemplate.opsForSet().remove(userTokensKey, refreshToken);
        }
    }

    public void deleteAllRefreshTokensOfUser(UUID userId) {
        String userTokensKey = USER_TOKENS_KEY_PREFIX + userId.toString();
        Set<String> tokens = redisTemplate.opsForSet().members(userTokensKey);
        
        if (tokens != null && !tokens.isEmpty()) {
            tokens.forEach(token -> {
                String tokenKey = REFRESH_TOKEN_KEY_PREFIX + token;
                redisTemplate.delete(tokenKey);
            });
            redisTemplate.delete(userTokensKey);
        }
    }

    public String rotateRefreshToken(String oldRefreshToken, UUID userId) {
        deleteRefreshToken(oldRefreshToken);
        return createRefreshToken(userId);
    }

    public void extendRefreshToken(String refreshToken) {
        String tokenKey = REFRESH_TOKEN_KEY_PREFIX + refreshToken;
        long ttlInSeconds = refreshTokenExpirationMs / 1000;
        
        redisTemplate.expire(tokenKey, ttlInSeconds, TimeUnit.SECONDS);
        
        UUID userId = verifyRefreshToken(refreshToken);
        if (userId != null) {
            String userTokensKey = USER_TOKENS_KEY_PREFIX + userId.toString();
            redisTemplate.expire(userTokensKey, ttlInSeconds, TimeUnit.SECONDS);
        }
    }

    public Long getActiveTokenCount(UUID userId) {
        String userTokensKey = USER_TOKENS_KEY_PREFIX + userId.toString();
        return redisTemplate.opsForSet().size(userTokensKey);
    }

    public Set<String> getUserTokens(UUID userId) {
        String userTokensKey = USER_TOKENS_KEY_PREFIX + userId.toString();
        return redisTemplate.opsForSet().members(userTokensKey);
    }

    public boolean hasActiveSession(UUID userId) {
        Long count = getActiveTokenCount(userId);
        return count != null && count > 0;
    }
}
