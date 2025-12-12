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
            EventResponse event = eventService.createEvent(request, currentUserId);
            return ResponseEntity.status(HttpStatus.CREATED).body(event);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Lỗi khi tạo sự kiện: " + e.getMessage()));
        }
    }

    @GetMapping("/organizer/my-events")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<List<EventResponse>> getMyEvents(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        UUID currentUserId = userDetails.getId();
        List<EventResponse> events = eventService.getMyEvents(currentUserId);
        return ResponseEntity.ok(events);
    }

    @GetMapping("/events")
    public ResponseEntity<List<EventResponse>> getAllEvents() {
        List<EventResponse> events = eventService.getAllPublicEvents();
        return ResponseEntity.ok(events);
    }

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
}
