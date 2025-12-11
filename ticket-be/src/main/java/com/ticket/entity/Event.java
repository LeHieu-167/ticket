package com.ticket.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "events")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String location;

    /**
     * Địa chỉ chi tiết của sự kiện
     */
    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "event_date", nullable = false)
    private LocalDateTime eventDate;

    /**
     * Thời gian kết thúc sự kiện
     */
    @Column(name = "event_end_date")
    private LocalDateTime eventEndDate;

    /**
     * Giá vé mặc định (giữ lại để backward compatible)
     * Nên sử dụng TicketType để quản lý giá theo loại vé
     */
    @Column(name = "ticket_price", nullable = false)
    private BigDecimal ticketPrice;

    /**
     * Tổng số vé còn lại (tổng hợp từ tất cả TicketType)
     */
    @Column(name = "available_tickets", nullable = false)
    private Integer availableTickets;

    /**
     * Tổng số vé ban đầu
     */
    @Column(name = "total_tickets")
    private Integer totalTickets;

    @Column(name = "organizer_id", nullable = false)
    private Long organizerId;

    /**
     * Tên đơn vị tổ chức
     */
    @Column(name = "organizer_name", length = 200)
    private String organizerName;

    /**
     * URL hình ảnh banner sự kiện
     */
    @Column(name = "banner_image_url", length = 500)
    private String bannerImageUrl;

    /**
     * URL hình ảnh thumbnail
     */
    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    /**
     * Điều khoản và điều kiện
     */
    @Column(name = "terms_and_conditions", columnDefinition = "TEXT")
    private String termsAndConditions;

    @Column(name = "is_active")
    private boolean isActive = true;

    /**
     * Danh sách các loại vé của sự kiện
     */
    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TicketType> ticketTypes = new ArrayList<>();

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (totalTickets == null) {
            totalTickets = availableTickets;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Thêm loại vé vào sự kiện
     */
    public void addTicketType(TicketType ticketType) {
        ticketTypes.add(ticketType);
        ticketType.setEvent(this);
    }

    /**
     * Xóa loại vé khỏi sự kiện
     */
    public void removeTicketType(TicketType ticketType) {
        ticketTypes.remove(ticketType);
        ticketType.setEvent(null);
    }

    /**
     * Tính tổng số vé còn lại từ tất cả loại vé
     */
    public int calculateTotalAvailableTickets() {
        return ticketTypes.stream()
                .filter(TicketType::getIsActive)
                .mapToInt(TicketType::getAvailableQuantity)
                .sum();
    }
}

