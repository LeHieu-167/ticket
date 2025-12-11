package com.ticket.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtils {
    private static final Logger logger = LoggerFactory.getLogger(JwtUtils.class);

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.access-token.expiration}")
    private long accessTokenExpirationMs;

    @Value("${jwt.refresh-token.expiration}")
    private long refreshTokenExpirationMs;

    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Tạo Access Token từ Authentication (dùng khi login)
     */
    public String generateAccessToken(Authentication authentication) {
        UserDetails userPrincipal = (UserDetails) authentication.getPrincipal();
        return generateAccessTokenFromUsername(userPrincipal.getUsername());
    }

    /**
     * Tạo Access Token từ username (dùng khi refresh token)
     */
    public String generateAccessTokenFromUsername(String username) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + accessTokenExpirationMs);

        return Jwts.builder()
                .subject(username)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Deprecated: Sử dụng generateAccessToken thay thế
     */
    @Deprecated
    public String generateJwtToken(Authentication authentication) {
        return generateAccessToken(authentication);
    }

    /**
     * Deprecated: Sử dụng generateAccessTokenFromUsername thay thế
     */
    @Deprecated
    public String generateTokenFromUsername(String username) {
        return generateAccessTokenFromUsername(username);
    }

    public String getUserNameFromJwtToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    public boolean validateJwtToken(String authToken) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(authToken);
            return true;
        } catch (SignatureException e) {
            logger.error("Invalid JWT signature: {}", e.getMessage());
        } catch (MalformedJwtException e) {
            logger.error("Invalid JWT token: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            logger.error("JWT token is expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            logger.error("JWT token is unsupported: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            logger.error("JWT claims string is empty: {}", e.getMessage());
        }
        return false;
    }

    /**
     * Lấy expiration date từ token
     */
    public Date getExpirationDateFromToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return claims.getExpiration();
        } catch (Exception e) {
            logger.error("Error getting expiration date from token: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Tính thời gian còn lại (TTL) của token theo giây
     * Dùng để set TTL cho blacklist trong Redis
     */
    public long getRemainingTimeInSeconds(String token) {
        Date expirationDate = getExpirationDateFromToken(token);
        if (expirationDate == null) {
            return 0;
        }
        
        long now = System.currentTimeMillis();
        long expiration = expirationDate.getTime();
        long remaining = expiration - now;
        
        // Trả về số giây, nếu đã hết hạn thì trả về 0
        return remaining > 0 ? remaining / 1000 : 0;
    }

    /**
     * Kiểm tra token đã hết hạn chưa
     */
    public boolean isTokenExpired(String token) {
        Date expirationDate = getExpirationDateFromToken(token);
        if (expirationDate == null) {
            return true;
        }
        return expirationDate.before(new Date());
    }

    /**
     * Lấy thời gian expiration của Access Token (ms)
     */
    public long getAccessTokenExpirationMs() {
        return accessTokenExpirationMs;
    }

    /**
     * Lấy thời gian expiration của Refresh Token (ms)
     */
    public long getRefreshTokenExpirationMs() {
        return refreshTokenExpirationMs;
    }
}

