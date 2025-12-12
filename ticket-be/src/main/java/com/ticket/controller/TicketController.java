package com.ticket.controller;

import com.ticket.dto.*;
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

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
@Slf4j
public class TicketController {

    private final TicketService ticketService;
    private final QRCodeService qrCodeService;

    @PostMapping("/types")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")
    public ResponseEntity<TicketTypeResponse> createTicketType(@Valid @RequestBody TicketTypeRequest request) {
        log.info("Tạo loại vé mới cho sự kiện {}", request.getEventId());
        TicketTypeResponse response = ticketService.createTicketType(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/types/event/{eventId}")
    public ResponseEntity<List<TicketTypeResponse>> getTicketTypesByEvent(@PathVariable UUID eventId) {
        List<TicketTypeResponse> ticketTypes = ticketService.getTicketTypesByEvent(eventId);
        return ResponseEntity.ok(ticketTypes);
    }

    @GetMapping("/types/event/{eventId}/available")
    public ResponseEntity<List<TicketTypeResponse>> getAvailableTicketTypes(@PathVariable UUID eventId) {
        List<TicketTypeResponse> ticketTypes = ticketService.getAvailableTicketTypes(eventId);
        return ResponseEntity.ok(ticketTypes);
    }

    @PostMapping("/generate/{orderId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<TicketResponse>> generateTickets(@PathVariable UUID orderId) {
        log.info("Tạo vé cho đơn hàng {}", orderId);
        List<TicketResponse> tickets = ticketService.generateTicketsForOrder(orderId);
        return ResponseEntity.status(HttpStatus.CREATED).body(tickets);
    }

    @GetMapping("/{ticketId}")
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
        List<TicketResponse> tickets = ticketService.getTicketsByOrder(orderId);
        return ResponseEntity.ok(tickets);
    }

    @GetMapping("/my-tickets")
    public ResponseEntity<List<TicketResponse>> getMyTickets(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        log.info("Lấy danh sách vé của user: {}", userDetails.getUsername());
        List<TicketResponse> tickets = ticketService.getTicketsByCustomer(userDetails.getId());
        return ResponseEntity.ok(tickets);
    }

    @GetMapping("/my-tickets/event/{eventId}")
    public ResponseEntity<List<TicketResponse>> getMyTicketsForEvent(
            @PathVariable UUID eventId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        log.info("Lấy danh sách vé của user {} cho sự kiện {}", userDetails.getUsername(), eventId);
        List<TicketResponse> tickets = ticketService.getTicketsByCustomerAndEvent(userDetails.getId(), eventId);
        return ResponseEntity.ok(tickets);
    }

    @GetMapping("/verify/{ticketCode}")
    public ResponseEntity<TicketResponse> verifyTicket(@PathVariable String ticketCode) {
        log.info("Verify vé: {}", ticketCode);
        TicketResponse ticket = ticketService.verifyTicket(ticketCode);
        return ResponseEntity.ok(ticket);
    }

    @PostMapping("/check-in/{ticketCode}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<TicketResponse> checkInTicket(
            @PathVariable String ticketCode,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        log.info("Check-in vé {} bởi {}", ticketCode, userDetails.getUsername());
        UUID staffId = userDetails.getId();
        TicketResponse ticket = ticketService.checkInTicket(ticketCode, staffId);
        return ResponseEntity.ok(ticket);
    }

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
            @RequestParam(required = false, defaultValue = "Yêu cầu hủy từ admin") String reason) {
        log.info("Hủy vé {} với lý do: {}", ticketId, reason);
        TicketResponse ticket = ticketService.cancelTicket(ticketId, reason);
        return ResponseEntity.ok(ticket);
    }

    @GetMapping("/statistics/event/{eventId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")
    public ResponseEntity<TicketService.TicketStatistics> getEventStatistics(@PathVariable UUID eventId) {
        log.info("Lấy thống kê vé cho sự kiện {}", eventId);
        TicketService.TicketStatistics statistics = ticketService.getEventTicketStatistics(eventId);
        return ResponseEntity.ok(statistics);
    }
}
