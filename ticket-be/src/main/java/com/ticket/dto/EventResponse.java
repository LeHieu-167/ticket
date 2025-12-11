package com.ticket.dto;

import com.ticket.entity.Event;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventResponse {
    private Long id;
    private String name;
    private String description;
    private String location;
    private LocalDateTime eventDate;
    private BigDecimal ticketPrice;
    private Integer availableTickets;
    private Long organizerId;
    private boolean isActive;
    private LocalDateTime createdAt;

    public static EventResponse fromEntity(Event event) {
        EventResponse response = new EventResponse();
        response.setId(event.getId());
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

