package com.ticket.controller;

import com.ticket.dto.*;
import com.ticket.security.UserDetailsImpl;
import com.ticket.security.UserDetailsImpl;
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
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.UUID;

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

     * Chỉ ADMIN hoặc ORGANIZER (sở hữu event) mới có quyền
     */
    @PostMapping("/types")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")
    public ResponseEntity<TicketTypeResponse> createTicketType(
            @Valid @RequestBody TicketTypeRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        log.info("📝 Tạo loại vé mới cho sự kiện {}", request.getEventId());

        // Lấy thông tin user hiện tại
        UUID currentUserId = null;
        boolean isAdmin = false;
        if (userDetails instanceof UserDetailsImpl) {
            currentUserId = ((UserDetailsImpl) userDetails).getId();
            isAdmin = userDetails.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        }

        TicketTypeResponse response = ticketService.createTicketType(request, currentUserId, isAdmin);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/types/event/{eventId}")
    public ResponseEntity<List<TicketTypeResponse>> getTicketTypesByEvent(@PathVariable UUID eventId) {
    public ResponseEntity<List<TicketTypeResponse>> getTicketTypesByEvent(@PathVariable UUID eventId) {
        List<TicketTypeResponse> ticketTypes = ticketService.getTicketTypesByEvent(eventId);
        return ResponseEntity.ok(ticketTypes);
    }

    @GetMapping("/types/event/{eventId}/available")
    public ResponseEntity<List<TicketTypeResponse>> getAvailableTicketTypes(@PathVariable UUID eventId) {
    public ResponseEntity<List<TicketTypeResponse>> getAvailableTicketTypes(@PathVariable UUID eventId) {
        List<TicketTypeResponse> ticketTypes = ticketService.getAvailableTicketTypes(eventId);
        return ResponseEntity.ok(ticketTypes);
    }

    @PostMapping("/generate/{orderId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<TicketResponse>> generateTickets(@PathVariable UUID orderId) {
        log.info("🎫 Tạo vé cho đơn hàng {}", orderId);
        List<TicketResponse> tickets = ticketService.generateTicketsForOrder(orderId);
        return ResponseEntity.status(HttpStatus.CREATED).body(tickets);
    }

    @GetMapping("/{ticketId}")
    public ResponseEntity<TicketResponse> getTicketById(@PathVariable UUID ticketId) {
    public ResponseEntity<TicketResponse> getTicketById(@PathVariable UUID ticketId) {
        TicketResponse ticket = ticketService.getTicketById(ticketId);
        return ResponseEntity.ok(ticket);
    }

    @GetMapping("/code/{ticketCode}")
    public ResponseEntity<TicketResponse> getTicketByCode(@PathVariable String ticketCode) {
        TicketResponse ticket = ticketService.getTicketByCode(ticketCode);
        return ResponseEntity.ok(ticket);
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<List<TicketResponse>> getTicketsByOrder(@PathVariable UUID orderId) {
    public ResponseEntity<List<TicketResponse>> getTicketsByOrder(@PathVariable UUID orderId) {
        List<TicketResponse> tickets = ticketService.getTicketsByOrder(orderId);
        return ResponseEntity.ok(tickets);
    }

    @GetMapping("/my-tickets")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<TicketResponse>> getMyTickets(@AuthenticationPrincipal UserDetails userDetails) {
        log.info("📋 Lấy danh sách vé của user: {}", userDetails.getUsername());
        
        // Lấy customerId từ UserDetailsImpl
        UUID customerId = null;
        if (userDetails instanceof UserDetailsImpl) {
            customerId = ((UserDetailsImpl) userDetails).getId();
        }
        
        if (customerId == null) {
            log.warn("⚠️ Không thể lấy customerId từ userDetails");
            return ResponseEntity.ok(List.of());
        }
        
        List<TicketResponse> tickets = ticketService.getTicketsByCustomer(customerId);
        log.info("📋 Tìm thấy {} vé cho user {}", tickets.size(), userDetails.getUsername());
        return ResponseEntity.ok(tickets);
    }

    /**
     * Lấy danh sách vé của người dùng cho một sự kiện
     */
    @GetMapping("/my-tickets/event/{eventId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<TicketResponse>> getMyTicketsForEvent(
            @PathVariable UUID eventId,
            @AuthenticationPrincipal UserDetails userDetails) {
        log.info("📋 Lấy danh sách vé của user {} cho sự kiện {}", userDetails.getUsername(), eventId);
        
        // Lấy customerId từ UserDetailsImpl
        UUID customerId = null;
        if (userDetails instanceof UserDetailsImpl) {
            customerId = ((UserDetailsImpl) userDetails).getId();
        }
        
        if (customerId == null) {
            return ResponseEntity.ok(List.of());
        }
        
        List<TicketResponse> tickets = ticketService.getTicketsByCustomerAndEvent(customerId, eventId);
        return ResponseEntity.ok(tickets);
    }

    // ==================== CHECK-IN ENDPOINTS ====================

    /**
     * Verify vé (kiểm tra thông tin, không thay đổi trạng thái)
     * Public endpoint để quét QR kiểm tra
     */
    @GetMapping("/verify/{ticketCode}")
    public ResponseEntity<TicketResponse> verifyTicket(@PathVariable String ticketCode) {
        log.info("Verify vé: {}", ticketCode);
        TicketResponse ticket = ticketService.verifyTicket(ticketCode);
        return ResponseEntity.ok(ticket);
    }

    /**
     * Check-in vé tại sự kiện
     * Chỉ ADMIN hoặc ORGANIZER mới có quyền
     */
    @PostMapping("/check-in/{ticketCode}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")
    public ResponseEntity<CheckInResponse> checkInTicket(
            @PathVariable String ticketCode,
            @AuthenticationPrincipal UserDetails userDetails) {
        log.info("Check-in vé {} bởi {}", ticketCode, userDetails.getUsername());
        
        try {
            // Lấy staffId từ UserDetailsImpl (UUID)
            UUID staffId = null;
            if (userDetails instanceof UserDetailsImpl) {
                staffId = ((UserDetailsImpl) userDetails).getId();
            }
            
            CheckInResponse response = ticketService.checkInTicketWithResponse(ticketCode, staffId);
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            log.warn("❌ Check-in thất bại cho vé {}: {}", ticketCode, e.getMessage());
            return ResponseEntity.ok(CheckInResponse.failure(e.getMessage()));
        }
    }

    // ==================== QR CODE ENDPOINTS ====================

    /**
     * Lấy hình ảnh QR Code của vé
     */
    @GetMapping("/qr/{ticketCode}")
    public ResponseEntity<byte[]> getTicketQRCode(@PathVariable String ticketCode) {
        log.info("Lấy QR Code cho vé: {}", ticketCode);
        TicketResponse ticket = ticketService.getTicketByCode(ticketCode);
        
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

    @PostMapping("/{ticketId}/cancel")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TicketResponse> cancelTicket(
            @PathVariable UUID ticketId,
            @PathVariable UUID ticketId,
            @RequestParam(required = false, defaultValue = "Yêu cầu hủy từ admin") String reason) {
        log.info("Hủy vé {} với lý do: {}", ticketId, reason);
        log.info("Hủy vé {} với lý do: {}", ticketId, reason);
        TicketResponse ticket = ticketService.cancelTicket(ticketId, reason);
        return ResponseEntity.ok(ticket);
    }

    @GetMapping("/statistics/event/{eventId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")
    public ResponseEntity<TicketService.TicketStatistics> getEventStatistics(@PathVariable UUID eventId) {
        log.info("📊 Lấy thống kê vé cho sự kiện {}", eventId);
        TicketService.TicketStatistics statistics = ticketService.getEventTicketStatistics(eventId);
        return ResponseEntity.ok(statistics);
    }
}
