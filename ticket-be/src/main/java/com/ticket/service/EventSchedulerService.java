package com.ticket.service;

import com.ticket.entity.Event;
import com.ticket.entity.EventStatus;
import com.ticket.entity.Ticket;
import com.ticket.repository.EventRepository;
import com.ticket.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

/**
 * Scheduled Service để tự động cập nhật trạng thái sự kiện
 * 
 * Nguyên tắc:
 * - Quét các sự kiện đã hết thời gian (eventEndDate hoặc eventDate)
 * - Tự động chuyển trạng thái từ ACTIVE/STOP_SELLING sang COMPLETED
 * - Chạy định kỳ mỗi phút
 * 
 * Điều này đảm bảo:
 * - Vé của sự kiện đã kết thúc sẽ không còn hiệu lực
 * - Giao diện hiển thị đúng trạng thái sự kiện
 * - Check-in không thể thực hiện sau khi sự kiện kết thúc
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EventSchedulerService {

    private final EventRepository eventRepository;
    private final TicketRepository ticketRepository;
    private final NotificationService notificationService;

    /**
     * Các trạng thái có thể chuyển sang COMPLETED
     * - ACTIVE: Đang bán vé, sự kiện đang diễn ra
     * - STOP_SELLING: Ngừng bán vé nhưng sự kiện vẫn chưa kết thúc
     */
    private static final List<EventStatus> COMPLETABLE_STATUSES = Arrays.asList(
            EventStatus.ACTIVE,
            EventStatus.STOP_SELLING
    );

    /**
     * Job tự động chuyển trạng thái sự kiện đã kết thúc sang COMPLETED
     * Chạy mỗi 60 giây (1 phút)
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void autoCompleteExpiredEvents() {
        LocalDateTime now = LocalDateTime.now();
        log.debug("Bắt đầu kiểm tra sự kiện đã kết thúc - Thời điểm: {}", now);

        int totalCompleted = 0;

        // 1. Xử lý các sự kiện có eventEndDate
        totalCompleted += processEventsWithEndDate(now);

        // 2. Xử lý các sự kiện không có eventEndDate (fallback: sau 24h kể từ eventDate)
        totalCompleted += processEventsWithoutEndDate(now);

        if (totalCompleted > 0) {
            log.info("✅ Hoàn tất: {} sự kiện đã được chuyển sang trạng thái COMPLETED", totalCompleted);
        }
    }

    /**
     * Xử lý các sự kiện có eventEndDate đã qua
     */
    private int processEventsWithEndDate(LocalDateTime now) {
        List<Event> expiredEvents = eventRepository.findByEventEndDateBeforeAndStatusIn(now, COMPLETABLE_STATUSES);

        if (expiredEvents.isEmpty()) {
            return 0;
        }

        log.info("Tìm thấy {} sự kiện có eventEndDate đã qua", expiredEvents.size());

        for (Event event : expiredEvents) {
            completeEvent(event);
        }

        eventRepository.saveAll(expiredEvents);
        return expiredEvents.size();
    }

    /**
     * Xử lý các sự kiện không có eventEndDate
     * Fallback: Coi sự kiện kết thúc sau 24h kể từ eventDate
     */
    private int processEventsWithoutEndDate(LocalDateTime now) {
        // Tìm các sự kiện có eventDate trước (now - 24h) và không có eventEndDate
        LocalDateTime threshold = now.minusHours(24);
        
        List<Event> expiredEvents = eventRepository.findByEventDateBeforeAndEventEndDateIsNullAndStatusIn(
                threshold, 
                COMPLETABLE_STATUSES
        );

        if (expiredEvents.isEmpty()) {
            return 0;
        }

        log.info("Tìm thấy {} sự kiện không có eventEndDate đã qua 24h", expiredEvents.size());

        for (Event event : expiredEvents) {
            completeEvent(event);
        }

        eventRepository.saveAll(expiredEvents);
        return expiredEvents.size();
    }

    /**
     * Chuyển sự kiện sang trạng thái COMPLETED và gửi thông báo
     * Đồng thời chuyển tất cả vé ACTIVE sang EXPIRED
     */
    private void completeEvent(Event event) {
        EventStatus previousStatus = event.getStatus();
        event.setStatus(EventStatus.COMPLETED);

        // Chuyển tất cả vé ACTIVE của sự kiện sang EXPIRED
        // Vé đã USED (đã check-in) sẽ giữ nguyên trạng thái
        int expiredTickets = ticketRepository.updateActiveToExpiredByEventId(event.getId());
        if (expiredTickets > 0) {
            log.info("Đã chuyển {} vé ACTIVE sang EXPIRED cho sự kiện: {}", expiredTickets, event.getName());
        }

        log.info("Sự kiện đã hoàn thành: {} (ID: {}) - Trạng thái trước: {} -> COMPLETED",
                event.getName(), event.getId(), previousStatus);

        // Gửi notification cho organizer
        try {
            String message = String.format(
                    "Sự kiện \"%s\" đã kết thúc và được chuyển sang trạng thái COMPLETED.%s",
                    event.getName(),
                    expiredTickets > 0 ? String.format(" %d vé chưa sử dụng đã hết hạn.", expiredTickets) : ""
            );

            notificationService.notifyEventStatusChanged(
                    event.getOrganizerId(),
                    event.getId(),
                    "COMPLETED",
                    message
            );
        } catch (Exception e) {
            // Không để lỗi notification ảnh hưởng đến việc cập nhật trạng thái
            log.warn("Không thể gửi notification cho organizer: {}", e.getMessage());
        }
    }
}
