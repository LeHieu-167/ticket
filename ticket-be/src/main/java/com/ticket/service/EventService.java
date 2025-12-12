package com.ticket.service;

import com.ticket.dto.EventRequest;
import com.ticket.dto.EventResponse;
import com.ticket.entity.Event;
import com.ticket.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EventService {
    
    private final EventRepository eventRepository;

    @Transactional
    public EventResponse createEvent(EventRequest request, UUID organizerId) {
        Event event = new Event();
        event.setName(request.getName());
        event.setDescription(request.getDescription());
        event.setLocation(request.getLocation());
        event.setEventDate(request.getEventDate());
        event.setTicketPrice(request.getTicketPrice());
        event.setAvailableTickets(request.getAvailableTickets());
        event.setOrganizerId(organizerId);
        event.setActive(true);
        
        String slug = Event.generateSlug(request.getName());
        while (eventRepository.existsBySlug(slug)) {
            slug = Event.generateSlug(request.getName());
        }
        event.setSlug(slug);

        Event savedEvent = eventRepository.save(event);
        return EventResponse.fromEntity(savedEvent);
    }

    @Transactional(readOnly = true)
    public List<EventResponse> getMyEvents(UUID organizerId) {
        List<Event> events = eventRepository.findByOrganizerId(organizerId);
        return events.stream()
                .map(EventResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<EventResponse> getAllPublicEvents() {
        List<Event> events = eventRepository.findByIsActiveTrue();
        return events.stream()
                .map(EventResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public EventResponse getEventById(UUID eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện với ID: " + eventId));
        return EventResponse.fromEntity(event);
    }
    
    @Transactional(readOnly = true)
    public EventResponse getEventBySlug(String slug) {
        Event event = eventRepository.findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện với slug: " + slug));
        return EventResponse.fromEntity(event);
    }
}
