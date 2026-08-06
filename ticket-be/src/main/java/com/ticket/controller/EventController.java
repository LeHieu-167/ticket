package com.ticket.controller;

import com.ticket.dto.EventRequest;
import com.ticket.dto.EventResponse;
import com.ticket.dto.MessageResponse;
import com.ticket.security.UserDetailsImpl;
import com.ticket.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class EventController {
    
    private final EventService eventService;

    @PostMapping("/events")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<?> createEvent(
            @Valid @RequestBody EventRequest request,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            UUID currentUserId = userDetails.getId();
            
            // Tạo sự kiện với organizerId = currentUserId, status = PENDING_APPROVAL
            EventResponse event = eventService.createEvent(request, currentUserId);
            return ResponseEntity.status(HttpStatus.CREATED).body(event);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Lỗi khi tạo sự kiện: " + e.getMessage()));
        }
    }

    /**
     * API cho Organizer lưu sự kiện dưới dạng bản nháp
     * POST /api/events/draft
     * Sự kiện DRAFT có thể chỉnh sửa thoải mái trước khi gửi duyệt
     */
    @PostMapping("/events/draft")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<?> saveDraft(
            @RequestBody EventRequest request,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            UUID currentUserId = userDetails.getId();

            EventResponse event = eventService.saveDraft(request, currentUserId);

            return ResponseEntity.status(HttpStatus.CREATED).body(event);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Lỗi khi lưu bản nháp: " + e.getMessage()));
        }
    }

    /**
     * API cho Organizer gửi sự kiện DRAFT hoặc REJECTED để Admin duyệt
     * PUT /api/events/{id}/submit
     */
    @PutMapping("/events/{id}/submit")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<?> submitForApproval(
            @PathVariable UUID id,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            UUID currentUserId = userDetails.getId();

            eventService.submitForApproval(id, currentUserId);

            return ResponseEntity.ok(new MessageResponse("Sự kiện đã được gửi để Admin duyệt!"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * API cho Organizer cập nhật sự kiện của mình
     * PUT /api/events/{id}
     * Logic quan trọng: Chỉ organizer sở hữu event mới được cập nhật
     */
    @PutMapping("/events/{id}")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<?> updateEvent(
            @PathVariable UUID id,
            @Valid @RequestBody EventRequest request,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            UUID currentUserId = userDetails.getId();
            boolean isAdmin = userDetails.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

            // Cập nhật sự kiện (service sẽ kiểm tra quyền sở hữu)
            EventResponse event = eventService.updateEvent(id, request, currentUserId, isAdmin);

            return ResponseEntity.ok(event);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * API cho Organizer xóa sự kiện của mình
     * DELETE /api/events/{id}
     * Logic quan trọng: Chỉ organizer sở hữu event mới được xóa
     */
    @DeleteMapping("/events/{id}")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<?> deleteEvent(
            @PathVariable UUID id,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            UUID currentUserId = userDetails.getId();
            boolean isAdmin = userDetails.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

            // Xóa sự kiện (service sẽ kiểm tra quyền sở hữu)
            eventService.deleteEvent(id, currentUserId, isAdmin);

            return ResponseEntity.ok(new MessageResponse("Đã xóa sự kiện thành công!"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * API cho Organizer xem danh sách sự kiện của chính họ
     * GET /api/organizer/my-events
     * Logic quan trọng: Lọc sự kiện theo organizer_id
     */
    @GetMapping("/organizer/my-events")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<List<EventResponse>> getMyEvents(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        UUID currentUserId = userDetails.getId();
        
        // Lọc sự kiện theo organizer_id
        List<EventResponse> events = eventService.getMyEvents(currentUserId);
        return ResponseEntity.ok(events);
    }

    /**
     * API lấy thống kê cho dashboard của Organizer
     * GET /api/organizer/stats
     */
    @GetMapping("/organizer/stats")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<com.ticket.dto.OrganizerStatsResponse> getOrganizerStats(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(eventService.getOrganizerStats(userDetails.getId()));
    }

    /**
     * API công khai cho khách hàng xem tất cả sự kiện
     * GET /api/events
     * Không cần đăng nhập
     */
    @GetMapping("/events")
    public ResponseEntity<List<EventResponse>> getAllEvents() {
        List<EventResponse> events = eventService.getAllPublicEvents();
        return ResponseEntity.ok(events);
    }

    /**
     * API xem chi tiết một sự kiện theo ID
     * GET /api/events/{id}
     */
    @GetMapping("/events/{id}")
    public ResponseEntity<?> getEventById(@PathVariable UUID id) {
        try {
            EventResponse event = eventService.getEventById(id);
            return ResponseEntity.ok(event);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * API xem chi tiết sự kiện theo slug (SEO-friendly URL)
     * GET /api/events/slug/{slug}
     */
    @GetMapping("/events/slug/{slug}")
    public ResponseEntity<?> getEventBySlug(@PathVariable String slug) {
        try {
            EventResponse event = eventService.getEventBySlug(slug);
            return ResponseEntity.ok(event);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * API cho Organizer bật/tắt trạng thái bán vé của sự kiện
     * PUT /api/events/{id}/toggle-sales
     * Logic: Toggle giữa ACTIVE và STOP_SELLING
     * - active=true: Chuyển sang ACTIVE (mở bán)
     * - active=false: Chuyển sang STOP_SELLING (ngừng bán)
     * - Không truyền active: Toggle trạng thái
     */
    @PutMapping("/events/{id}/toggle-sales")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<?> toggleEventSales(
            @PathVariable UUID id,
            @RequestParam(required = false) Boolean active,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            UUID currentUserId = userDetails.getId();

            EventResponse event = eventService.toggleEventSales(id, currentUserId, active);

            String message = event.isActive() 
                ? "Sự kiện đã được mở bán vé!" 
                : "Sự kiện đã tạm ngừng bán vé!";
            
            return ResponseEntity.ok(event);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * API cho Organizer ngừng bán vé (ACTIVE -> STOP_SELLING)
     * PUT /api/events/{id}/stop-selling
     */
    @PutMapping("/events/{id}/stop-selling")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<?> stopSelling(
            @PathVariable UUID id,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            UUID currentUserId = userDetails.getId();

            EventResponse event = eventService.stopSelling(id, currentUserId);
            
            return ResponseEntity.ok(event);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * API cho Organizer mở lại bán vé (STOP_SELLING -> ACTIVE)
     * PUT /api/events/{id}/resume-selling
     */
    @PutMapping("/events/{id}/resume-selling")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<?> resumeSelling(
            @PathVariable UUID id,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            UUID currentUserId = userDetails.getId();

            EventResponse event = eventService.resumeSelling(id, currentUserId);
            
            return ResponseEntity.ok(event);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * API cho Organizer hủy sự kiện (-> CANCELLED)
     * PUT /api/events/{id}/cancel
     * Dùng khi đã bán vé và cần kích hoạt quy trình hoàn tiền
     */
    @PutMapping("/events/{id}/cancel")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<?> cancelEvent(
            @PathVariable UUID id,
            @RequestParam(required = false) String reason,
            Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            UUID currentUserId = userDetails.getId();
            boolean isAdmin = userDetails.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

            EventResponse event = eventService.cancelEvent(id, currentUserId, isAdmin, reason);
            
            return ResponseEntity.ok(event);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse(e.getMessage()));
        }
    }
}

