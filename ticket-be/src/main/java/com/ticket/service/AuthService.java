package com.ticket.service;

import com.ticket.dto.JwtResponse;
import com.ticket.dto.LoginRequest;
import com.ticket.dto.RegisterRequest;
import com.ticket.entity.Role;
import com.ticket.entity.Role.RoleName;
import com.ticket.entity.User;
import com.ticket.repository.RoleRepository;
import com.ticket.repository.UserRepository;
import com.ticket.security.JwtUtils;
import com.ticket.security.UserDetailsImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AuthService {
    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @Autowired
    private TokenBlacklistService tokenBlacklistService;

    @Transactional
    public JwtResponse login(LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        String accessToken = jwtUtils.generateAccessToken(authentication);
        String refreshToken = refreshTokenService.createRefreshToken(userDetails.getId());
        
        List<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toList());

        logger.info("User {} logged in successfully", userDetails.getUsername());

        return new JwtResponse(
                accessToken,
                refreshToken,
                userDetails.getId(),
                userDetails.getUsername(),
                userDetails.getEmail(),
                roles
        );
    }

    @Transactional
    public JwtResponse refreshToken(String refreshToken) {
        UUID userId = refreshTokenService.verifyRefreshToken(refreshToken);
        
        if (userId == null) {
            throw new RuntimeException("Refresh token không hợp lệ hoặc đã hết hạn!");
        }
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại!"));
        
        String newAccessToken = jwtUtils.generateAccessTokenFromUsername(user.getUsername());
        String newRefreshToken = refreshTokenService.rotateRefreshToken(refreshToken, userId);
        
        List<String> roles = user.getRoles().stream()
                .map(role -> role.getName().name())
                .collect(Collectors.toList());

        logger.info("Token refreshed for user {}", user.getUsername());

        return new JwtResponse(
                newAccessToken,
                newRefreshToken,
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                roles
        );
    }

    @Transactional
    public void logout(String accessToken, String refreshToken, boolean logoutAll) {
        if (accessToken != null) {
            long ttl = jwtUtils.getRemainingTimeInSeconds(accessToken);
            if (ttl > 0) {
                tokenBlacklistService.addToBlacklist(accessToken, ttl);
                logger.info("Access token added to blacklist with TTL: {} seconds", ttl);
            }
        }
        
        if (refreshToken != null) {
            if (logoutAll) {
                UUID userId = refreshTokenService.verifyRefreshToken(refreshToken);
                if (userId != null) {
                    refreshTokenService.deleteAllRefreshTokensOfUser(userId);
                    logger.info("User {} logged out from all devices", userId);
                }
            } else {
                refreshTokenService.deleteRefreshToken(refreshToken);
                logger.info("Refresh token deleted");
            }
        }
    }

    @Transactional
    public void logout(String accessToken) {
        logout(accessToken, null, false);
    }

    @Transactional
    public void registerCustomer(RegisterRequest registerRequest) {
        validateRegisterRequest(registerRequest);
        User user = createUser(registerRequest);
        
        Role customerRole = roleRepository.findByName(RoleName.ROLE_CUSTOMER)
                .orElseThrow(() -> new RuntimeException("Error: Role CUSTOMER is not found."));
        
        Set<Role> roles = new HashSet<>();
        roles.add(customerRole);
        user.setRoles(roles);

        userRepository.save(user);
    }

    @Transactional
    public void registerOrganizer(RegisterRequest registerRequest) {
        validateRegisterRequest(registerRequest);
        User user = createUser(registerRequest);
        
        Role organizerRole = roleRepository.findByName(RoleName.ROLE_ORGANIZER)
                .orElseThrow(() -> new RuntimeException("Error: Role ORGANIZER is not found."));
        
        Set<Role> roles = new HashSet<>();
        roles.add(organizerRole);
        user.setRoles(roles);

        userRepository.save(user);
    }

    @Transactional
    public void registerAdmin(RegisterRequest registerRequest) {
        validateRegisterRequest(registerRequest);
        User user = createUser(registerRequest);
        
        Role adminRole = roleRepository.findByName(RoleName.ROLE_ADMIN)
                .orElseThrow(() -> new RuntimeException("Error: Role ADMIN is not found."));
        
        Set<Role> roles = new HashSet<>();
        roles.add(adminRole);
        user.setRoles(roles);

        userRepository.save(user);
    }

    private void validateRegisterRequest(RegisterRequest registerRequest) {
        if (userRepository.existsByUsername(registerRequest.getUsername())) {
            throw new RuntimeException("Error: Username đã được sử dụng!");
        }
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new RuntimeException("Error: Email đã được sử dụng!");
        }
    }

    private User createUser(RegisterRequest registerRequest) {
        User user = new User();
        user.setUsername(registerRequest.getUsername());
        user.setEmail(registerRequest.getEmail());
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        user.setFullName(registerRequest.getFullName());
        user.setPhoneNumber(registerRequest.getPhoneNumber());
        user.setActive(true);
        return user;
    }
}
