package com.ticket.service;

import com.ticket.dto.EventRequest;
import com.ticket.dto.EventResponse;
import com.ticket.entity.Event;
import com.ticket.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EventService {
    
    private final EventRepository eventRepository;

    @Transactional
    public EventResponse createEvent(EventRequest request, Long organizerId) {
        Event event = new Event();
        event.setName(request.getName());
        event.setDescription(request.getDescription());
        event.setLocation(request.getLocation());
        event.setEventDate(request.getEventDate());
        event.setTicketPrice(request.getTicketPrice());
        event.setAvailableTickets(request.getAvailableTickets());
        event.setOrganizerId(organizerId); // Quan trọng: Lấy từ JWT token
        event.setActive(true);

        Event savedEvent = eventRepository.save(event);
        return EventResponse.fromEntity(savedEvent);
    }

    @Transactional(readOnly = true)
    public List<EventResponse> getMyEvents(Long organizerId) {
        // Logic quan trọng: Lọc sự kiện theo organizer_id
        List<Event> events = eventRepository.findByOrganizerId(organizerId);
        return events.stream()
                .map(EventResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<EventResponse> getAllPublicEvents() {
        // API công khai: Chỉ trả về sự kiện đang hoạt động
        List<Event> events = eventRepository.findByIsActiveTrue();
        return events.stream()
                .map(EventResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public EventResponse getEventById(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện với ID: " + eventId));
        return EventResponse.fromEntity(event);
    }
}

