package com.ticket.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String fullName;
    private String phoneNumber;
    private String address;
    private String avatarUrl; // URL ảnh từ Cloudinary
    // Không có username, password, email (thường email là định danh, hạn chế sửa)
}

