package com.ticket.controller;

import com.ticket.dto.EventResponse;
import com.ticket.dto.MessageResponse;
import com.ticket.entity.Event;
import com.ticket.entity.EventStatus;
import com.ticket.repository.EventRepository;
import com.ticket.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Controller dành cho Admin quản lý sự kiện
 * Bao gồm: Duyệt, từ chối, xem danh sách sự kiện
 */
@RestController
@RequestMapping("/api/admin/events")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final EventRepository eventRepository;

    /**
     * Lấy tất cả sự kiện (để admin quản lý)
     * GET /api/admin/events
     * GET /api/admin/events?status=PENDING_APPROVAL
     */
    @GetMapping
    public ResponseEntity<List<EventResponse>> getAllEvents(
            @RequestParam(required = false) EventStatus status) {
        List<Event> events;

        if (status != null) {
            // Lọc theo status nếu có tham số
            events = eventRepository.findByStatus(status);
        } else {
            // Lấy tất cả, sắp xếp theo ngày tạo mới nhất
            events = eventRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        }

        List<EventResponse> responses = events.stream()
                .map(EventResponse::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    /**
     * Lấy danh sách sự kiện đang chờ duyệt
     * GET /api/admin/events/pending
     */
    @GetMapping("/pending")
    public ResponseEntity<List<EventResponse>> getPendingEvents() {
        List<Event> events = eventRepository.findByStatusOrderByCreatedAtDesc(EventStatus.PENDING_APPROVAL);

        List<EventResponse> responses = events.stream()
                .map(EventResponse::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    /**
     * API DUYỆT SỰ KIỆN
     * PUT /api/admin/events/{eventId}/approve
     * Đổi trạng thái sang ACTIVE -> Sự kiện bắt đầu hiện trên trang chủ
     */
    @PutMapping("/{eventId}/approve")
    public ResponseEntity<?> approveEvent(
            @PathVariable UUID eventId,
            Authentication authentication) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện với ID: " + eventId));

        // Kiểm tra trạng thái hiện tại
        if (event.getStatus() != EventStatus.PENDING_APPROVAL) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Chỉ có thể duyệt sự kiện đang ở trạng thái chờ duyệt"));
        }

        // Lấy thông tin Admin đang duyệt
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        // Đổi trạng thái sang ACTIVE và lưu thông tin người duyệt
        event.setStatus(EventStatus.ACTIVE);
        event.setReviewedBy(userDetails.getId());
        event.setReviewedAt(LocalDateTime.now());
        event.setRejectionReason(null); // Clear rejection reason nếu có
        eventRepository.save(event);

        return ResponseEntity.ok(new MessageResponse("Đã duyệt sự kiện thành công!"));
    }

    /**
     * API TỪ CHỐI SỰ KIỆN
     * PUT /api/admin/events/{eventId}/reject
     */
    @PutMapping("/{eventId}/reject")
    public ResponseEntity<?> rejectEvent(
            @PathVariable UUID eventId,
            @RequestParam(required = false) String reason,
            Authentication authentication) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện với ID: " + eventId));

        // Kiểm tra trạng thái hiện tại
        if (event.getStatus() != EventStatus.PENDING_APPROVAL) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Chỉ có thể từ chối sự kiện đang ở trạng thái chờ duyệt"));
        }

        // Lấy thông tin Admin đang từ chối
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        // Đổi trạng thái sang REJECTED và lưu thông tin người từ chối
        event.setStatus(EventStatus.REJECTED);
        event.setReviewedBy(userDetails.getId());
        event.setReviewedAt(LocalDateTime.now());
        event.setRejectionReason(reason);
        eventRepository.save(event);

        String message = "Đã từ chối sự kiện.";
        if (reason != null && !reason.isEmpty()) {
            message += " Lý do: " + reason;
        }

        return ResponseEntity.ok(new MessageResponse(message));
    }

    /**
     * API HỦY SỰ KIỆN (Admin có thể hủy bất kỳ sự kiện nào)
     * PUT /api/admin/events/{eventId}/cancel
     */
    @PutMapping("/{eventId}/cancel")
    public ResponseEntity<?> cancelEvent(
            @PathVariable UUID eventId,
            @RequestParam(required = false) String reason,
            Authentication authentication) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện với ID: " + eventId));

        // Lấy thông tin Admin đang hủy
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        // Đổi trạng thái sang CANCELLED và lưu thông tin
        event.setStatus(EventStatus.CANCELLED);
        event.setActive(false);
        event.setReviewedBy(userDetails.getId());
        event.setReviewedAt(LocalDateTime.now());
        event.setRejectionReason(reason);
        eventRepository.save(event);

        String message = "Đã hủy sự kiện.";
        if (reason != null && !reason.isEmpty()) {
            message += " Lý do: " + reason;
        }

        return ResponseEntity.ok(new MessageResponse(message));
    }

    /**
     * Xem chi tiết một sự kiện (Admin có thể xem bất kỳ sự kiện nào)
     * GET /api/admin/events/{eventId}
     */
    @GetMapping("/{eventId}")
    public ResponseEntity<?> getEventDetail(@PathVariable UUID eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện với ID: " + eventId));

        return ResponseEntity.ok(EventResponse.fromEntity(event));
    }
}

