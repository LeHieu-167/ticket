package com.ticket.dto;

import com.ticket.entity.Ticket;
import com.ticket.entity.TicketType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketResponse {

    private UUID id;
    private String ticketCode;
    private String qrCodeBase64;
    private String qrCodeDataUri;
    
    // Thông tin đơn hàng
    private UUID orderId;
    private String orderCode;
    
    // Thông tin sự kiện
    private UUID eventId;
    private String eventName;
    private String eventLocation;
    private String eventAddress;
    private LocalDateTime eventDate;
    private LocalDateTime eventEndDate;
    private String eventBannerUrl;
    private String organizerName;
    private Long ticketTypeId;
    private String ticketTypeName;
    private BigDecimal ticketPrice;
    private String seatingType;
    private String zoneName;
    private String rowName;
    private String seatNumber;
    private String locationDisplay;
    private Integer sequenceNumber;
    private String holderName;
    private String holderEmail;
    private String holderPhone;
    private String status;
    private LocalDateTime checkedInAt;
    private String termsAndConditions;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Chuyển đổi từ Entity sang DTO (không có QR code)
     */
    public static TicketResponse fromEntity(Ticket ticket) {
        return fromEntity(ticket, null);
    }

    /**
     * Chuyển đổi từ Entity sang DTO (có QR code)
     */
    public static TicketResponse fromEntity(Ticket ticket, String qrCodeBase64) {
        TicketResponseBuilder builder = TicketResponse.builder()
                .id(ticket.getId())
                .ticketCode(ticket.getTicketCode())
                .qrCodeBase64(qrCodeBase64)
                .qrCodeDataUri(qrCodeBase64 != null ? "data:image/png;base64," + qrCodeBase64 : null)
                .orderId(ticket.getOrder().getId())
                .sequenceNumber(ticket.getSequenceNumber())
                .holderName(ticket.getHolderName())
                .holderEmail(ticket.getHolderEmail())
                .holderPhone(ticket.getHolderPhone())
                .status(ticket.getStatus().name())
                .checkedInAt(ticket.getCheckedInAt())
                .createdAt(ticket.getCreatedAt())
                .updatedAt(ticket.getUpdatedAt());

        if (ticket.getEvent() != null) {
            builder.eventId(ticket.getEvent().getId())
                    .eventName(ticket.getEvent().getName())
                    .eventLocation(ticket.getEvent().getLocation())
                    .eventAddress(ticket.getEvent().getAddress())
                    .eventDate(ticket.getEvent().getEventDate())
                    .eventEndDate(ticket.getEvent().getEventEndDate())
                    .eventBannerUrl(ticket.getEvent().getBannerImageUrl())
                    .organizerName(ticket.getEvent().getOrganizerName())
                    .termsAndConditions(ticket.getEvent().getTermsAndConditions());
        }

        TicketType.SeatingType seatingType = null;
        if (ticket.getTicketType() != null) {
            seatingType = ticket.getTicketType().getSeatingType();
            builder.ticketTypeId(ticket.getTicketType().getId())
                    .ticketTypeName(ticket.getTicketType().getName())
                    .ticketPrice(ticket.getTicketType().getPrice())
                    .seatingType(seatingType != null ? seatingType.name() : null);
        }

        builder.zoneName(ticket.getZoneName())
                .rowName(ticket.getRowName())
                .seatNumber(ticket.getSeatNumber());

        String locationDisplay = buildLocationDisplay(seatingType, ticket.getZoneName(), ticket.getRowName(), ticket.getSeatNumber());
        builder.locationDisplay(locationDisplay);

        return builder.build();
    }

    private static String buildLocationDisplay(TicketType.SeatingType seatingType, String zoneName, String rowName, String seatNumber) {
        StringBuilder sb = new StringBuilder();
        
        if (zoneName != null && !zoneName.isEmpty()) {
            sb.append("Khu vực: ").append(zoneName);
        }
        
        if (seatingType != null && seatingType != TicketType.SeatingType.ZONE_ONLY) {
            if (rowName != null && !rowName.isEmpty()) {
                if (sb.length() > 0) sb.append(" | ");
                sb.append("Hàng: ").append(rowName);
            }
        }
        
        if (seatingType == TicketType.SeatingType.FULL_SEAT) {
            if (seatNumber != null && !seatNumber.isEmpty()) {
                if (sb.length() > 0) sb.append(" | ");
                sb.append("Ghế: ").append(seatNumber);
            }
        }
        
        return sb.length() > 0 ? sb.toString() : null;
    }
}
