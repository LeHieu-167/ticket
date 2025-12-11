package com.ticket.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity đại diện cho loại vé của một sự kiện
 * Mỗi Event có thể có nhiều TicketType (VIP, Standard, etc.)
 * 
 * Hỗ trợ các loại chỗ ngồi khác nhau:
 * - ZONE_ONLY: Chỉ có khu vực (sự kiện ngoài trời, đứng)
 * - ZONE_WITH_ROW: Có khu vực và hàng (không có số ghế cụ thể)
 * - FULL_SEAT: Có đầy đủ khu vực, hàng, số ghế (concert trong nhà)
 */
@Entity
@Table(name = "ticket_types", indexes = {
    @Index(name = "idx_ticket_type_event", columnList = "event_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Sự kiện mà loại vé này thuộc về
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    /**
     * Tên loại vé: VIP, Standard, LYING, STANDING, etc.
     */
    @Column(nullable = false, length = 100)
    private String name;

    /**
     * Mô tả loại vé
     */
    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * Giá vé
     */
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal price;

    /**
     * Tổng số vé loại này
     */
    @Column(name = "total_quantity", nullable = false)
    private Integer totalQuantity;

    /**
     * Số vé còn lại
     */
    @Column(name = "available_quantity", nullable = false)
    private Integer availableQuantity;

    // ==================== SEATING CONFIGURATION ====================

    /**
     * Loại chỗ ngồi - quyết định cách hiển thị thông tin vị trí trên vé
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "seating_type", nullable = false)
    @Builder.Default
    private SeatingType seatingType = SeatingType.ZONE_ONLY;

    /**
     * Tên khu vực (luôn có)
     * Ví dụ: "VIP Zone", "General Admission", "Khu A", "Sân khấu chính"
     */
    @Column(name = "zone_name", length = 100)
    private String zoneName;

    /**
     * Mô tả khu vực (tùy chọn)
     * Ví dụ: "Gần sân khấu, có ghế ngồi", "Khu vực đứng tự do"
     */
    @Column(name = "zone_description", length = 500)
    private String zoneDescription;

    /**
     * Danh sách các hàng (chỉ dùng khi seatingType = ZONE_WITH_ROW hoặc FULL_SEAT)
     * Format: comma-separated "A,B,C,D,E" hoặc "1,2,3,4,5"
     */
    @Column(name = "row_labels", length = 500)
    private String rowLabels;

    /**
     * Số ghế mỗi hàng (chỉ dùng khi seatingType = FULL_SEAT)
     */
    @Column(name = "seats_per_row")
    private Integer seatsPerRow;

    /**
     * Cho phép người dùng chọn ghế hay hệ thống tự động gán
     * true = user chọn ghế trên sơ đồ
     * false = hệ thống tự động gán ghế theo thứ tự
     */
    @Column(name = "allow_seat_selection")
    @Builder.Default
    private Boolean allowSeatSelection = false;

    // ==================== DISPLAY CONFIGURATION ====================

    /**
     * Màu hiển thị trên UI (sơ đồ ghế, danh sách)
     */
    @Column(name = "color_code", length = 20)
    private String colorCode; // #FF5733

    /**
     * Thứ tự hiển thị trong danh sách loại vé
     */
    @Column(name = "display_order")
    private Integer displayOrder;

    /**
     * Loại vé có đang được bán hay không
     */
    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (availableQuantity == null) {
            availableQuantity = totalQuantity;
        }
        if (seatingType == null) {
            seatingType = SeatingType.ZONE_ONLY;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Kiểm tra còn vé hay không
     */
    public boolean hasAvailableTickets() {
        return availableQuantity != null && availableQuantity > 0;
    }

    /**
     * Giảm số vé khả dụng
     */
    public void decreaseAvailableQuantity(int quantity) {
        if (this.availableQuantity >= quantity) {
            this.availableQuantity -= quantity;
        } else {
            throw new IllegalStateException("Không đủ vé");
        }
    }

    /**
     * Tăng số vé khả dụng (khi hủy đơn)
     */
    public void increaseAvailableQuantity(int quantity) {
        this.availableQuantity += quantity;
        if (this.availableQuantity > this.totalQuantity) {
            this.availableQuantity = this.totalQuantity;
        }
    }

    /**
     * Kiểm tra loại vé này có hỗ trợ chọn hàng không
     */
    public boolean hasRowInfo() {
        return seatingType == SeatingType.ZONE_WITH_ROW || seatingType == SeatingType.FULL_SEAT;
    }

    /**
     * Kiểm tra loại vé này có hỗ trợ chọn ghế cụ thể không
     */
    public boolean hasSeatInfo() {
        return seatingType == SeatingType.FULL_SEAT;
    }

    /**
     * Loại chỗ ngồi
     */
    public enum SeatingType {
        /**
         * Chỉ có khu vực, không có hàng/ghế cụ thể
         * Dùng cho: Sự kiện ngoài trời, festival, khu vực đứng
         * Vé hiển thị: "Khu vực: VIP Zone"
         */
        ZONE_ONLY,

        /**
         * Có khu vực và hàng, không có số ghế cụ thể
         * Dùng cho: Sự kiện có hàng ghế dài (bench), không đánh số từng ghế
         * Vé hiển thị: "Khu vực: VIP | Hàng: A"
         */
        ZONE_WITH_ROW,

        /**
         * Có đầy đủ khu vực, hàng và số ghế
         * Dùng cho: Concert trong nhà, rạp hát, sân vận động có ghế cố định
         * Vé hiển thị: "Khu vực: VIP | Hàng: A | Ghế: 15"
         */
        FULL_SEAT
    }
}

