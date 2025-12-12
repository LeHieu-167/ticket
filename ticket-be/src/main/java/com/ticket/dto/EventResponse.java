package com.ticket.dto;

import com.ticket.entity.Event;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventResponse {
    private UUID id;
    private String slug;
    private String name;
    private String description;
    private String location;
    private LocalDateTime eventDate;
    private BigDecimal ticketPrice;
    private Integer availableTickets;
    private UUID organizerId;
    private boolean isActive;
    private LocalDateTime createdAt;

    public static EventResponse fromEntity(Event event) {
        EventResponse response = new EventResponse();
        response.setId(event.getId());
        response.setSlug(event.getSlug());
        response.setName(event.getName());
        response.setDescription(event.getDescription());
        response.setLocation(event.getLocation());
        response.setEventDate(event.getEventDate());
        response.setTicketPrice(event.getTicketPrice());
        response.setAvailableTickets(event.getAvailableTickets());
        response.setOrganizerId(event.getOrganizerId());
        response.setActive(event.isActive());
        response.setCreatedAt(event.getCreatedAt());
        return response;
    }
}
