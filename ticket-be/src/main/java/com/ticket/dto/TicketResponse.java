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

/**
 * DTO trả về thông tin vé điện tử đầy đủ
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketResponse {

    private UUID id;
    private String ticketCode;
    
    // QR Code
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
    
    // Thông tin loại vé
    private Long ticketTypeId;
    private String ticketTypeName;
    private BigDecimal ticketPrice;
    private String seatingType; // ZONE_ONLY, ZONE_WITH_ROW, FULL_SEAT
    
    // Thông tin vị trí (linh hoạt theo seatingType)
    private String zoneName;        // Luôn có: "VIP Zone", "General Admission"
    private String rowName;         // Có khi ZONE_WITH_ROW hoặc FULL_SEAT: "A", "B"
    private String seatNumber;      // Chỉ có khi FULL_SEAT: "15"
    private String locationDisplay; // Chuỗi hiển thị tổng hợp
    
    // Số thứ tự
    private Integer sequenceNumber;
    
    // Thông tin người sở hữu
    private String holderName;
    private String holderEmail;
    private String holderPhone;
    
    // Trạng thái
    private String status;
    private LocalDateTime checkedInAt;
    
    // Điều khoản
    private String termsAndConditions;
    
    // Timestamps
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

        // Thông tin sự kiện
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

        // Thông tin loại vé và seating type
        TicketType.SeatingType seatingType = null;
        if (ticket.getTicketType() != null) {
            seatingType = ticket.getTicketType().getSeatingType();
            builder.ticketTypeId(ticket.getTicketType().getId())
                    .ticketTypeName(ticket.getTicketType().getName())
                    .ticketPrice(ticket.getTicketType().getPrice())
                    .seatingType(seatingType != null ? seatingType.name() : null);
        }

        // Thông tin vị trí
        builder.zoneName(ticket.getZoneName())
                .rowName(ticket.getRowName())
                .seatNumber(ticket.getSeatNumber());

        // Tạo chuỗi hiển thị vị trí dựa trên seatingType
        String locationDisplay = buildLocationDisplay(
                seatingType,
                ticket.getZoneName(),
                ticket.getRowName(),
                ticket.getSeatNumber()
        );
        builder.locationDisplay(locationDisplay);

        return builder.build();
    }

    /**
     * Tạo chuỗi hiển thị vị trí dựa trên loại chỗ ngồi
     * 
     * - ZONE_ONLY: "Khu vực: VIP Zone"
     * - ZONE_WITH_ROW: "Khu vực: VIP Zone | Hàng: A"
     * - FULL_SEAT: "Khu vực: VIP Zone | Hàng: A | Ghế: 15"
     */
    private static String buildLocationDisplay(
            TicketType.SeatingType seatingType,
            String zoneName,
            String rowName,
            String seatNumber) {
        
        StringBuilder sb = new StringBuilder();
        
        // Zone luôn hiển thị (nếu có)
        if (zoneName != null && !zoneName.isEmpty()) {
            sb.append("Khu vực: ").append(zoneName);
        }
        
        // Row chỉ hiển thị khi seatingType cho phép
        if (seatingType != null && seatingType != TicketType.SeatingType.ZONE_ONLY) {
            if (rowName != null && !rowName.isEmpty()) {
                if (sb.length() > 0) sb.append(" | ");
                sb.append("Hàng: ").append(rowName);
            }
        }
        
        // Seat chỉ hiển thị khi FULL_SEAT
        if (seatingType == TicketType.SeatingType.FULL_SEAT) {
            if (seatNumber != null && !seatNumber.isEmpty()) {
                if (sb.length() > 0) sb.append(" | ");
                sb.append("Ghế: ").append(seatNumber);
            }
        }
        
        return sb.length() > 0 ? sb.toString() : null;
    }
}

