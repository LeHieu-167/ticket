package com.ticket.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity đại diện cho một vé điện tử chi tiết
 * Mỗi Order có thể có nhiều Ticket (1 Order - N Tickets)
 */
@Entity
@Table(name = "tickets", indexes = {
    @Index(name = "idx_ticket_code", columnList = "ticket_code", unique = true),
    @Index(name = "idx_ticket_order", columnList = "order_id"),
    @Index(name = "idx_ticket_event", columnList = "event_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ticket {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "VARCHAR(36)")
    private UUID id;

    /**
     * Mã vé duy nhất - dùng để tạo QR Code
     * Format: EVENT{eventId}_ORDER{orderId}_{timestamp}_{sequence}
     */
    @Column(name = "ticket_code", nullable = false, unique = true, length = 100)
    private String ticketCode;

    /**
     * Mã QR dạng chuỗi (có thể là URL hoặc data để encode)
     */
    @Column(name = "qr_data", columnDefinition = "TEXT")
    private String qrData;

    /**
     * Order mà vé này thuộc về
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    /**
     * Sự kiện mà vé này dành cho
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    /**
     * Loại vé (VIP, Standard, LYING, etc.)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_type_id", nullable = false)
    private TicketType ticketType;

    // ==================== SEAT INFORMATION ====================
    // Các trường này có thể null tùy thuộc vào SeatingType của TicketType
    // - ZONE_ONLY: chỉ có zoneName
    // - ZONE_WITH_ROW: có zoneName + rowName
    // - FULL_SEAT: có zoneName + rowName + seatNumber

    /**
     * Tên khu vực (luôn có giá trị)
     * Ví dụ: "VIP Zone", "General Admission", "Khu A"
     */
    @Column(name = "zone_name", length = 100)
    private String zoneName;

    /**
     * Tên hàng (chỉ có khi SeatingType = ZONE_WITH_ROW hoặc FULL_SEAT)
     * Ví dụ: "A", "B", "1", "2"
     */
    @Column(name = "row_name", length = 20)
    private String rowName;

    /**
     * Số ghế (chỉ có khi SeatingType = FULL_SEAT)
     * Ví dụ: "1", "2", "15"
     */
    @Column(name = "seat_number", length = 20)
    private String seatNumber;

    /**
     * Số thứ tự vé trong đơn hàng
     */
    @Column(name = "sequence_number")
    private Integer sequenceNumber;

    /**
     * Tên người sở hữu vé (có thể khác với người mua)
     */
    @Column(name = "holder_name", length = 200)
    private String holderName;

    /**
     * Email người sở hữu vé
     */
    @Column(name = "holder_email", length = 200)
    private String holderEmail;

    /**
     * Số điện thoại người sở hữu vé
     */
    @Column(name = "holder_phone", length = 20)
    private String holderPhone;

    /**
     * Trạng thái vé
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TicketStatus status;

    /**
     * Thời gian check-in (nếu đã check-in)
     */
    @Column(name = "checked_in_at")
    private LocalDateTime checkedInAt;

    /**
     * Người thực hiện check-in (staff ID - UUID)
     */
    @Column(name = "checked_in_by", columnDefinition = "VARCHAR(36)")
    private UUID checkedInBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = TicketStatus.ACTIVE;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Trạng thái của vé
     */
    public enum TicketStatus {
        PENDING,      // Đang chờ thanh toán
        ACTIVE,       // Đã kích hoạt (đã thanh toán, chưa sử dụng)
        USED,         // Đã sử dụng (đã check-in)
        CANCELLED,    // Đã hủy
        EXPIRED,      // Đã hết hạn (sự kiện đã qua)
        REFUNDED      // Đã hoàn tiền
    }
}

