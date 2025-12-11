package com.ticket.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/test")
public class TestController {

    /**
     * API công khai - không cần đăng nhập
     */
    @GetMapping("/public")
    public String publicAccess() {
        return "Nội dung công khai - Ai cũng có thể truy cập!";
    }

    /**
     * API chỉ dành cho CUSTOMER
     * Ví dụ: Đặt vé
     */
    @GetMapping("/customer")
    @PreAuthorize("hasRole('CUSTOMER')")
    public String customerAccess() {
        return "Nội dung dành cho KHÁCH HÀNG - Chức năng đặt vé!";
    }

    /**
     * API chỉ dành cho ORGANIZER
     * Ví dụ: Tạo sự kiện
     */
    @GetMapping("/organizer")
    @PreAuthorize("hasRole('ORGANIZER')")
    public String organizerAccess() {
        return "Nội dung dành cho NHÀ TỔ CHỨC - Chức năng tạo sự kiện!";
    }

    /**
     * API chỉ dành cho ADMIN
     * Ví dụ: Xem thống kê tổng
     */
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public String adminAccess() {
        return "Nội dung dành cho ADMIN - Xem thống kê tổng!";
    }

    /**
     * API cho cả CUSTOMER và ORGANIZER
     */
    @GetMapping("/user")
    @PreAuthorize("hasRole('CUSTOMER') or hasRole('ORGANIZER')")
    public String userAccess() {
        return "Nội dung dành cho người dùng đã đăng nhập (CUSTOMER hoặc ORGANIZER)";
    }
}
