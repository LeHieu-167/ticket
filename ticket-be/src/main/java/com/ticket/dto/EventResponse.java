package com.ticket.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ticket.entity.Event;
import com.ticket.entity.EventStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventResponse {
    private UUID id;
    private String name;
    private String slug;
    private String description;
    private String location;
    private String address;
    private LocalDateTime eventDate;
    private LocalDateTime eventEndDate;
    private BigDecimal ticketPrice;
    private Integer availableTickets;
    private Integer totalTickets;
    private UUID organizerId;
    private String organizerName;
    private String bannerImageUrl;
    private String thumbnailUrl;
    private String termsAndConditions;
    
    @JsonProperty("isActive")
    private boolean isActive;
    
    private EventStatus status;
    
    @JsonProperty("isBuyable")
    private boolean isBuyable;
    private String rejectionReason;
    private UUID reviewedBy;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<TicketTypeResponse> ticketTypes;

    public static EventResponse fromEntity(Event event) {
        EventResponse response = new EventResponse();
        response.setId(event.getId());
        response.setName(event.getName());
        response.setSlug(event.getSlug());
        response.setDescription(event.getDescription());
        response.setLocation(event.getLocation());
        response.setAddress(event.getAddress());
        response.setEventDate(event.getEventDate());
        response.setEventEndDate(event.getEventEndDate());
        response.setTicketPrice(event.getTicketPrice());
        response.setAvailableTickets(event.getAvailableTickets());
        response.setTotalTickets(event.getTotalTickets());
        response.setOrganizerId(event.getOrganizerId());
        response.setOrganizerName(event.getOrganizerName());
        response.setBannerImageUrl(event.getBannerImageUrl());
        response.setThumbnailUrl(event.getThumbnailUrl());
        response.setTermsAndConditions(event.getTermsAndConditions());
        response.setActive(event.isActive());
        response.setStatus(event.getStatus());
        // isBuyable = true khi status = ACTIVE và còn vé
        response.setBuyable(
            event.getStatus() == EventStatus.ACTIVE && 
            event.getAvailableTickets() != null && 
            event.getAvailableTickets() > 0
        );
        response.setRejectionReason(event.getRejectionReason());
        response.setReviewedBy(event.getReviewedBy());
        response.setReviewedAt(event.getReviewedAt());
        response.setCreatedAt(event.getCreatedAt());
        response.setUpdatedAt(event.getUpdatedAt());
        
        if (event.getTicketTypes() != null) {
            response.setTicketTypes(event.getTicketTypes().stream()
                    .map(TicketTypeResponse::fromEntity)
                    .collect(Collectors.toList()));
        }
        
        return response;
    }
}

