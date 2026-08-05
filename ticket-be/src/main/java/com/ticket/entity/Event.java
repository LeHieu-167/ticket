package com.ticket.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

@Entity
@Table(name = "events")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false)
    private String name;

    /**
     * URL-friendly slug được tạo tự động từ tên sự kiện
     * Ví dụ: "Đại Nhạc Hội" -> "dai-nhac-hoi"
     */
    @Column(name = "slug", nullable = false, unique = true)
    private String slug;

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

    /**
     * Tổng số vé đã bán
     */
    @Column(name = "tickets_sold")
    @Builder.Default
    private Integer ticketsSold = 0;

    /**
     * Tổng doanh thu từ sự kiện
     */
    @Column(name = "total_revenue")
    @Builder.Default
    private BigDecimal totalRevenue = BigDecimal.ZERO;

    @Column(name = "organizer_id", nullable = false)
    private UUID organizerId;

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
     * URL hình ảnh sơ đồ/map địa điểm
     */
    @Column(name = "map_image_url", length = 500)
    private String mapImageUrl;

    /**
     * Điều khoản và điều kiện
     */
    @Column(name = "terms_and_conditions", columnDefinition = "TEXT")
    private String termsAndConditions;

    @Column(name = "is_active")
    @Builder.Default
    private boolean isActive = true;

    /**
     * Trạng thái duyệt sự kiện
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    @Builder.Default
    private EventStatus status = EventStatus.PENDING_APPROVAL;

    /**
     * Lý do từ chối (nếu bị Admin từ chối)
     */
    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    /**
     * ID của Admin đã duyệt/từ chối
     */
    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    /**
     * Thời gian duyệt/từ chối
     */
    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

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
        // Tự động tạo slug từ name
        generateSlug();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        // Cập nhật slug nếu name thay đổi
        generateSlug();
    }

    /**
     * Tự động tạo slug từ tên sự kiện nếu chưa có hoặc đang trống
     */
    private void generateSlug() {
        if (this.name != null && (this.slug == null || this.slug.isEmpty())) {
            this.slug = toSlug(this.name) + "-" + System.currentTimeMillis();
        }
    }

    /**
     * Chuyển đổi Tiếng Việt có dấu thành slug URL-friendly không dấu
     * Ví dụ: "Đại Nhạc Hội Hà Nội" -> "dai-nhac-hoi-ha-noi"
     */
    private String toSlug(String input) {
        if (input == null) return null;

        // 1. Chuyển về chữ thường
        String result = input.toLowerCase(Locale.ENGLISH);

        // 2. Xử lý đặc biệt cho các ký tự Tiếng Việt
        result = result.replace("đ", "d").replace("Đ", "d");

        // 3. Loại bỏ dấu (Normalization)
        result = Normalizer.normalize(result, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        result = pattern.matcher(result).replaceAll("");

        // 4. Thay thế khoảng trắng và ký tự lạ bằng dấu gạch ngang
        result = result.replaceAll("[^a-z0-9\\s-]", "") // Bỏ ký tự đặc biệt
                       .replaceAll("\\s+", "-")         // Space -> gạch ngang
                       .replaceAll("-+", "-")           // Tránh gạch ngang kép
                       .replaceAll("^-|-$", "");        // Bỏ gạch ngang đầu/cuối

        return result;
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

