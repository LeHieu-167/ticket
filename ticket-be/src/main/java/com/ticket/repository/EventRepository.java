package com.ticket.repository;

import com.ticket.entity.Event;
import com.ticket.entity.EventStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EventRepository extends JpaRepository<Event, UUID> {
    /**
     * Tìm sự kiện theo slug (dùng cho SEO-friendly URL)
     */
    Optional<Event> findBySlug(String slug);

    /**
     * Kiểm tra slug đã tồn tại chưa
     */
    boolean existsBySlug(String slug);

    // Lấy danh sách sự kiện của một organizer cụ thể
    List<Event> findByOrganizerId(UUID organizerId);
    
    // Lấy danh sách sự kiện đang hoạt động (công khai)
    List<Event> findByIsActiveTrue();

    // Lấy danh sách sự kiện theo trạng thái
    List<Event> findByStatus(EventStatus status);

    // Lấy danh sách sự kiện theo trạng thái, sắp xếp theo ngày tạo mới nhất
    List<Event> findByStatusOrderByCreatedAtDesc(EventStatus status);

    // Lấy danh sách sự kiện của organizer theo trạng thái
    List<Event> findByOrganizerIdAndStatus(UUID organizerId, EventStatus status);

    // Lấy danh sách sự kiện của organizer, sắp xếp theo ngày tạo mới nhất
    List<Event> findByOrganizerIdOrderByCreatedAtDesc(UUID organizerId);

    // ==================== ORGANIZER STATISTICS ====================

    /**
     * Đếm tổng số sự kiện của một Organizer
     */
    long countByOrganizerId(UUID organizerId);

    /**
     * Đếm số sự kiện của Organizer theo trạng thái
     */
    long countByOrganizerIdAndStatus(UUID organizerId, EventStatus status);

    /**
     * Lấy danh sách sự kiện theo nhiều trạng thái
     */
    List<Event> findByStatusInOrderByCreatedAtDesc(List<EventStatus> statuses);

    /**
     * Lấy danh sách sự kiện của organizer, loại trừ trạng thái DELETED
     */
    List<Event> findByOrganizerIdAndStatusNotOrderByCreatedAtDesc(UUID organizerId, EventStatus status);
}

