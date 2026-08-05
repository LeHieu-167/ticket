package com.ticket.dto;

import com.ticket.entity.TicketType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketTypeResponse {

    private Long id;
    private UUID eventId;
    private String eventName;
    private String name;
    private String description;
    private BigDecimal price;
    private Integer totalQuantity;
    private Integer availableQuantity;
    private Integer soldQuantity;
    private BigDecimal revenue;  // Doanh thu = soldQuantity * price
    
    // Seating configuration
    private String seatingType;       // ZONE_ONLY, ZONE_WITH_ROW, FULL_SEAT
    private String zoneName;
    private String zoneDescription;
    private String rowLabels;
    private Integer seatsPerRow;
    private Boolean allowSeatSelection;
    private String colorCode;
    private Integer displayOrder;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static TicketTypeResponse fromEntity(TicketType ticketType) {
        return TicketTypeResponse.builder()
                .id(ticketType.getId())
                .eventId(ticketType.getEvent() != null ? ticketType.getEvent().getId() : null)
                .eventName(ticketType.getEvent() != null ? ticketType.getEvent().getName() : null)
                .name(ticketType.getName())
                .description(ticketType.getDescription())
                .price(ticketType.getPrice())
                .totalQuantity(ticketType.getTotalQuantity())
                .availableQuantity(ticketType.getAvailableQuantity())
                .soldQuantity(ticketType.getTotalQuantity() - ticketType.getAvailableQuantity())
                .revenue(ticketType.getPrice().multiply(
                        BigDecimal.valueOf(ticketType.getTotalQuantity() - ticketType.getAvailableQuantity())))
                .seatingType(ticketType.getSeatingType() != null ? ticketType.getSeatingType().name() : null)
                .zoneName(ticketType.getZoneName())
                .zoneDescription(ticketType.getZoneDescription())
                .rowLabels(ticketType.getRowLabels())
                .seatsPerRow(ticketType.getSeatsPerRow())
                .allowSeatSelection(ticketType.getAllowSeatSelection())
                .colorCode(ticketType.getColorCode())
                .displayOrder(ticketType.getDisplayOrder())
                .isActive(ticketType.getIsActive())
                .createdAt(ticketType.getCreatedAt())
                .updatedAt(ticketType.getUpdatedAt())
                .build();
    }
}
