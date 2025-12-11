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

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class EventController {
    
    private final EventService eventService;

    /**
     * API cho Organizer tạo sự kiện mới
     * POST /api/events
     * Logic quan trọng: Lấy ID của organizer từ JWT token
     */
    @PostMapping("/events")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<?> createEvent(
            @Valid @RequestBody EventRequest request,
            Authentication authentication) {
        try {
            // Lấy ID của user hiện tại từ JWT token
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            Long currentUserId = userDetails.getId();
            
            // Tạo sự kiện với organizerId = currentUserId
            EventResponse event = eventService.createEvent(request, currentUserId);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(event);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Lỗi khi tạo sự kiện: " + e.getMessage()));
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
        // Lấy ID của user hiện tại từ JWT token
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Long currentUserId = userDetails.getId();
        
        // Lọc sự kiện theo organizer_id
        List<EventResponse> events = eventService.getMyEvents(currentUserId);
        
        return ResponseEntity.ok(events);
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
     * API xem chi tiết một sự kiện
     * GET /api/events/{id}
     */
    @GetMapping("/events/{id}")
    public ResponseEntity<?> getEventById(@PathVariable Long id) {
        try {
            EventResponse event = eventService.getEventById(id);
            return ResponseEntity.ok(event);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new MessageResponse(e.getMessage()));
        }
    }
}

