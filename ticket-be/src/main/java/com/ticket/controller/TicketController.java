package com.ticket.controller;

import com.ticket.dto.*;
import com.ticket.service.QRCodeService;
import com.ticket.service.TicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller quản lý vé điện tử
 */
@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
@Slf4j
public class TicketController {

    private final TicketService ticketService;
    private final QRCodeService qrCodeService;

    // ==================== TICKET TYPE ENDPOINTS ====================

    /**
     * Tạo loại vé mới cho sự kiện
     * Chỉ ADMIN hoặc ORGANIZER mới có quyền
     */
    @PostMapping("/types")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")
    public ResponseEntity<TicketTypeResponse> createTicketType(@Valid @RequestBody TicketTypeRequest request) {
        log.info("📝 Tạo loại vé mới cho sự kiện {}", request.getEventId());
        TicketTypeResponse response = ticketService.createTicketType(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Lấy danh sách loại vé của sự kiện
     */
    @GetMapping("/types/event/{eventId}")
    public ResponseEntity<List<TicketTypeResponse>> getTicketTypesByEvent(@PathVariable Long eventId) {
        List<TicketTypeResponse> ticketTypes = ticketService.getTicketTypesByEvent(eventId);
        return ResponseEntity.ok(ticketTypes);
    }

    /**
     * Lấy danh sách loại vé còn khả dụng của sự kiện
     */
    @GetMapping("/types/event/{eventId}/available")
    public ResponseEntity<List<TicketTypeResponse>> getAvailableTicketTypes(@PathVariable Long eventId) {
        List<TicketTypeResponse> ticketTypes = ticketService.getAvailableTicketTypes(eventId);
        return ResponseEntity.ok(ticketTypes);
    }

    // ==================== TICKET ENDPOINTS ====================

    /**
     * Tạo vé cho đơn hàng đã thanh toán
     * Chỉ ADMIN hoặc hệ thống gọi (sau khi thanh toán thành công)
     */
    @PostMapping("/generate/{orderId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<TicketResponse>> generateTickets(@PathVariable Long orderId) {
        log.info("🎫 Tạo vé cho đơn hàng {}", orderId);
        List<TicketResponse> tickets = ticketService.generateTicketsForOrder(orderId);
        return ResponseEntity.status(HttpStatus.CREATED).body(tickets);
    }

    /**
     * Lấy thông tin vé theo ID
     */
    @GetMapping("/{ticketId}")
    public ResponseEntity<TicketResponse> getTicketById(@PathVariable Long ticketId) {
        TicketResponse ticket = ticketService.getTicketById(ticketId);
        return ResponseEntity.ok(ticket);
    }

    /**
     * Lấy thông tin vé theo mã vé
     */
    @GetMapping("/code/{ticketCode}")
    public ResponseEntity<TicketResponse> getTicketByCode(@PathVariable String ticketCode) {
        TicketResponse ticket = ticketService.getTicketByCode(ticketCode);
        return ResponseEntity.ok(ticket);
    }

    /**
     * Lấy danh sách vé của đơn hàng
     */
    @GetMapping("/order/{orderId}")
    public ResponseEntity<List<TicketResponse>> getTicketsByOrder(@PathVariable Long orderId) {
        List<TicketResponse> tickets = ticketService.getTicketsByOrder(orderId);
        return ResponseEntity.ok(tickets);
    }

    /**
     * Lấy danh sách vé của người dùng hiện tại
     */
    @GetMapping("/my-tickets")
    public ResponseEntity<List<TicketResponse>> getMyTickets(@AuthenticationPrincipal UserDetails userDetails) {
        // TODO: Lấy customerId từ userDetails
        // Tạm thời trả về empty list
        log.info("📋 Lấy danh sách vé của user: {}", userDetails.getUsername());
        return ResponseEntity.ok(List.of());
    }

    /**
     * Lấy danh sách vé của người dùng cho một sự kiện
     */
    @GetMapping("/my-tickets/event/{eventId}")
    public ResponseEntity<List<TicketResponse>> getMyTicketsForEvent(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserDetails userDetails) {
        log.info("📋 Lấy danh sách vé của user {} cho sự kiện {}", userDetails.getUsername(), eventId);
        return ResponseEntity.ok(List.of());
    }

    // ==================== CHECK-IN ENDPOINTS ====================

    /**
     * Verify vé (kiểm tra thông tin, không thay đổi trạng thái)
     * Public endpoint để quét QR kiểm tra
     */
    @GetMapping("/verify/{ticketCode}")
    public ResponseEntity<TicketResponse> verifyTicket(@PathVariable String ticketCode) {
        log.info("🔍 Verify vé: {}", ticketCode);
        TicketResponse ticket = ticketService.verifyTicket(ticketCode);
        return ResponseEntity.ok(ticket);
    }

    /**
     * Check-in vé tại sự kiện
     * Chỉ ADMIN hoặc STAFF mới có quyền
     */
    @PostMapping("/check-in/{ticketCode}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<TicketResponse> checkInTicket(
            @PathVariable String ticketCode,
            @AuthenticationPrincipal UserDetails userDetails) {
        log.info("✅ Check-in vé {} bởi {}", ticketCode, userDetails.getUsername());
        // TODO: Lấy staffId từ userDetails
        Long staffId = 1L; // Tạm thời
        TicketResponse ticket = ticketService.checkInTicket(ticketCode, staffId);
        return ResponseEntity.ok(ticket);
    }

    // ==================== QR CODE ENDPOINTS ====================

    /**
     * Lấy hình ảnh QR Code của vé
     */
    @GetMapping("/qr/{ticketCode}")
    public ResponseEntity<byte[]> getTicketQRCode(@PathVariable String ticketCode) {
        log.info("📱 Lấy QR Code cho vé: {}", ticketCode);
        TicketResponse ticket = ticketService.getTicketByCode(ticketCode);
        
        // Tạo QR từ ticket data
        String qrContent = qrCodeService.buildTicketQRContent(
                ticket.getTicketCode(), 
                ticket.getEventId(), 
                ticket.getOrderId()
        );
        byte[] qrImage = qrCodeService.generateQRCodeImage(qrContent);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.IMAGE_PNG);
        headers.setContentLength(qrImage.length);

        return new ResponseEntity<>(qrImage, headers, HttpStatus.OK);
    }

    // ==================== CANCELLATION ENDPOINTS ====================

    /**
     * Hủy vé
     * Chỉ ADMIN mới có quyền
     */
    @PostMapping("/{ticketId}/cancel")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TicketResponse> cancelTicket(
            @PathVariable Long ticketId,
            @RequestParam(required = false, defaultValue = "Yêu cầu hủy từ admin") String reason) {
        log.info("❌ Hủy vé {} với lý do: {}", ticketId, reason);
        TicketResponse ticket = ticketService.cancelTicket(ticketId, reason);
        return ResponseEntity.ok(ticket);
    }

    // ==================== STATISTICS ENDPOINTS ====================

    /**
     * Thống kê vé của sự kiện
     * Chỉ ADMIN hoặc ORGANIZER mới có quyền
     */
    @GetMapping("/statistics/event/{eventId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")
    public ResponseEntity<TicketService.TicketStatistics> getEventStatistics(@PathVariable Long eventId) {
        log.info("📊 Lấy thống kê vé cho sự kiện {}", eventId);
        TicketService.TicketStatistics statistics = ticketService.getEventTicketStatistics(eventId);
        return ResponseEntity.ok(statistics);
    }
}

