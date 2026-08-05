package com.ticket.service;

import com.ticket.dto.EventRequest;
import com.ticket.dto.EventResponse;
import com.ticket.dto.OrganizerStatsResponse;
import com.ticket.dto.TicketTypeRequest;
import com.ticket.entity.Event;
import com.ticket.entity.EventStatus;
import com.ticket.entity.TicketType;
import com.ticket.repository.EventRepository;
import com.ticket.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EventService {
    
    private final EventRepository eventRepository;
    private final OrderRepository orderRepository;

    @Transactional(readOnly = true)
    public OrganizerStatsResponse getOrganizerStats(UUID organizerId) {
        Long ticketsSold = orderRepository.countTicketsSoldByOrganizerId(organizerId);
        BigDecimal totalRevenue = orderRepository.sumRevenueByOrganizerId(organizerId);
        Long totalCustomers = orderRepository.countCustomersByOrganizerId(organizerId);
        long activeEvents = eventRepository.countByOrganizerIdAndStatus(organizerId, EventStatus.ACTIVE);

        return OrganizerStatsResponse.builder()
                .ticketsSold(ticketsSold != null ? ticketsSold : 0L)
                .totalRevenue(totalRevenue != null ? totalRevenue : BigDecimal.ZERO)
                .totalCustomers(totalCustomers != null ? totalCustomers : 0L)
                .activeEvents(activeEvents)
                .build();
    }

    /**
     * Tạo sự kiện mới với trạng thái PENDING_APPROVAL
     * Organizer KHÔNG THỂ tự set status, luôn là chờ duyệt
     */
    @Transactional
    public EventResponse createEvent(EventRequest request, UUID organizerId) {
        return createEventWithStatus(request, organizerId, EventStatus.PENDING_APPROVAL);
    }

    /**
     * Lưu sự kiện dưới dạng bản nháp (DRAFT)
     * Sự kiện DRAFT không hiển thị cho Admin duyệt, Organizer có thể chỉnh sửa thoải mái
     */
    @Transactional
    public EventResponse saveDraft(EventRequest request, UUID organizerId) {
        return createEventWithStatus(request, organizerId, EventStatus.DRAFT);
    }

    /**
     * Method nội bộ để tạo sự kiện với trạng thái chỉ định
     */
    private EventResponse createEventWithStatus(EventRequest request, UUID organizerId, EventStatus status) {
        Event event = new Event();
        event.setName(request.getName());
        event.setDescription(request.getDescription());
        event.setLocation(request.getLocation());
        event.setAddress(request.getAddress());
        event.setEventDate(request.getEventDate());
        event.setEventEndDate(request.getEventEndDate());
        event.setTicketPrice(request.getTicketPrice());
        event.setAvailableTickets(request.getAvailableTickets());
        event.setOrganizerId(organizerId); // Quan trọng: Lấy từ JWT token
        event.setOrganizerName(request.getOrganizerName());
        event.setBannerImageUrl(request.getBannerImageUrl());
        event.setThumbnailUrl(request.getThumbnailUrl());
        event.setMapImageUrl(request.getMapImageUrl());
        event.setTermsAndConditions(request.getTermsAndConditions());
        event.setActive(true);

        // CỔNG CHẶN: Set trạng thái theo tham số (DRAFT hoặc PENDING_APPROVAL)
        event.setStatus(status);

        // Xử lý TicketTypes
        if (request.getTicketTypes() != null && !request.getTicketTypes().isEmpty()) {
            for (TicketTypeRequest typeReq : request.getTicketTypes()) {
                TicketType ticketType = new TicketType();
                ticketType.setName(typeReq.getName());
                ticketType.setDescription(typeReq.getDescription());
                ticketType.setPrice(typeReq.getPrice());
                ticketType.setTotalQuantity(typeReq.getTotalQuantity());
                ticketType.setAvailableQuantity(typeReq.getTotalQuantity());
                
                // Set defaults if missing
                ticketType.setZoneName(typeReq.getZoneName() != null ? typeReq.getZoneName() : "General Zone");
                ticketType.setSeatingType(TicketType.SeatingType.ZONE_ONLY);
                ticketType.setIsActive(true); // Quan trọng: Set mặc định là active
                ticketType.setAllowSeatSelection(false);

                event.addTicketType(ticketType);
            }
            
            // Cập nhật lại tổng số vé từ các loại vé
            int total = event.calculateTotalAvailableTickets();
            event.setAvailableTickets(total);
            event.setTotalTickets(total);
        }

        Event savedEvent = eventRepository.save(event);
        return EventResponse.fromEntity(savedEvent);
    }

    /**
     * Gửi sự kiện DRAFT hoặc REJECTED để Admin duyệt
     * Chỉ Organizer sở hữu sự kiện mới có thể gọi API này
     */
    @Transactional
    public EventResponse submitForApproval(UUID eventId, UUID organizerId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện với ID: " + eventId));

        // KIỂM TRA QUYỀN SỞ HỮU: Chỉ organizer tạo ra event mới được submit
        if (!event.getOrganizerId().equals(organizerId)) {
            throw new RuntimeException("Bạn không có quyền gửi duyệt sự kiện này!");
        }

        // KIỂM TRA TRẠNG THÁI: Chỉ DRAFT hoặc REJECTED mới được gửi duyệt lại
        if (event.getStatus() != EventStatus.DRAFT && event.getStatus() != EventStatus.REJECTED) {
            throw new RuntimeException("Chỉ có thể gửi duyệt sự kiện ở trạng thái Bản nháp hoặc Bị từ chối!");
        }

        // Chuyển sang trạng thái CHỜ DUYỆT
        event.setStatus(EventStatus.PENDING_APPROVAL);
        event.setRejectionReason(null); // Clear lý do từ chối cũ
        event.setReviewedBy(null);
        event.setReviewedAt(null);

        Event savedEvent = eventRepository.save(event);
        return EventResponse.fromEntity(savedEvent);
    }

    @Transactional
    public EventResponse updateEvent(UUID eventId, EventRequest request, UUID currentUserId, boolean isAdmin) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện với ID: " + eventId));

        // Kiểm tra quyền: Chỉ organizer sở hữu hoặc admin mới được cập nhật
        if (!isAdmin && !event.getOrganizerId().equals(currentUserId)) {
            throw new RuntimeException("Bạn không có quyền cập nhật sự kiện này!");
        }

        // QUAN TRỌNG: Không cho sửa sự kiện ở các trạng thái đặc biệt
        if (!isAdmin) {
            if (event.getStatus() == EventStatus.ACTIVE || event.getStatus() == EventStatus.STOP_SELLING) {
                throw new RuntimeException("Không thể sửa sự kiện đang hoạt động. Vui lòng liên hệ Admin!");
            }
            if (event.getStatus() == EventStatus.CANCELLED) {
                throw new RuntimeException("Không thể sửa sự kiện đã bị hủy!");
            }
            if (event.getStatus() == EventStatus.COMPLETED) {
                throw new RuntimeException("Không thể sửa sự kiện đã kết thúc!");
            }
            if (event.getStatus() == EventStatus.DELETED) {
                throw new RuntimeException("Sự kiện không tồn tại!");
            }
        }

        // Cập nhật thông tin sự kiện
        event.setName(request.getName());
        event.setDescription(request.getDescription());
        event.setLocation(request.getLocation());
        event.setAddress(request.getAddress());
        event.setEventDate(request.getEventDate());
        event.setEventEndDate(request.getEventEndDate());
        event.setTicketPrice(request.getTicketPrice());
        event.setAvailableTickets(request.getAvailableTickets());
        event.setOrganizerName(request.getOrganizerName());
        event.setBannerImageUrl(request.getBannerImageUrl());
        event.setThumbnailUrl(request.getThumbnailUrl());
        event.setMapImageUrl(request.getMapImageUrl());
        event.setTermsAndConditions(request.getTermsAndConditions());

        // QUAN TRỌNG: Nếu Organizer sửa sự kiện PENDING_APPROVAL hoặc REJECTED,
        // trạng thái sẽ chuyển về DRAFT để tránh việc sửa xong mà Admin không biết
        if (!isAdmin && (event.getStatus() == EventStatus.PENDING_APPROVAL || event.getStatus() == EventStatus.REJECTED)) {
            event.setStatus(EventStatus.DRAFT);
            event.setRejectionReason(null);
            event.setReviewedBy(null);
            event.setReviewedAt(null);
        }

        Event savedEvent = eventRepository.save(event);
        return EventResponse.fromEntity(savedEvent);
    }

    @Transactional
    public void deleteEvent(UUID eventId, UUID currentUserId, boolean isAdmin) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện với ID: " + eventId));

        // Kiểm tra quyền: Chỉ organizer sở hữu hoặc admin mới được xóa
        if (!isAdmin && !event.getOrganizerId().equals(currentUserId)) {
            throw new RuntimeException("Bạn không có quyền xóa sự kiện này!");
        }

        // Không cho xóa sự kiện đã bị hủy hoặc đã xóa
        if (event.getStatus() == EventStatus.CANCELLED) {
            throw new RuntimeException("Không thể xóa sự kiện đã bị hủy!");
        }
        if (event.getStatus() == EventStatus.DELETED) {
            throw new RuntimeException("Sự kiện đã được xóa trước đó!");
        }

        // Kiểm tra số vé đã bán
        Long ticketsSold = orderRepository.countTicketsSoldByEventId(eventId);
        
        if (ticketsSold != null && ticketsSold > 0) {
            // Đã có người mua vé -> Không cho xóa, hướng dẫn sử dụng chức năng hủy
            throw new RuntimeException(
                "Không thể xóa sự kiện đã có " + ticketsSold + " vé được bán. " +
                "Vui lòng sử dụng chức năng \"Hủy sự kiện\" để kích hoạt quy trình hoàn tiền."
            );
        }

        // Chưa có ai mua vé -> Cho phép Soft Delete
        event.setStatus(EventStatus.DELETED);
        event.setActive(false);
        eventRepository.save(event);
    }

    /**
     * Lấy danh sách sự kiện của organizer (loại trừ DELETED)
     */
    @Transactional(readOnly = true)
    public List<EventResponse> getMyEvents(UUID organizerId) {
        // Logic quan trọng: Lọc sự kiện theo organizer_id, loại trừ DELETED
        List<Event> events = eventRepository.findByOrganizerIdAndStatusNotOrderByCreatedAtDesc(
            organizerId, 
            EventStatus.DELETED
        );
        return events.stream()
                .map(EventResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Lấy danh sách sự kiện công khai (ACTIVE và STOP_SELLING)
     * STOP_SELLING vẫn hiển thị nhưng không cho mua vé
     */
    @Transactional(readOnly = true)
    public List<EventResponse> getAllPublicEvents() {
        // API công khai: Trả về sự kiện ACTIVE và STOP_SELLING
        List<EventStatus> publicStatuses = Arrays.asList(EventStatus.ACTIVE, EventStatus.STOP_SELLING);
        List<Event> events = eventRepository.findByStatusInOrderByCreatedAtDesc(publicStatuses);
        return events.stream()
                .map(EventResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Lấy danh sách sự kiện đang chờ duyệt (CHỈ DÀNH CHO ADMIN)
     */
    @Transactional(readOnly = true)
    public List<EventResponse> getPendingEvents() {
        List<Event> events = eventRepository.findByStatusOrderByCreatedAtDesc(EventStatus.PENDING_APPROVAL);
        return events.stream()
                .map(EventResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public EventResponse getEventById(UUID eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện với ID: " + eventId));
        
        // Không trả về sự kiện đã bị xóa
        if (event.getStatus() == EventStatus.DELETED) {
            throw new RuntimeException("Sự kiện không tồn tại hoặc đã bị xóa!");
        }
        
        return EventResponse.fromEntity(event);
    }

    /**
     * Lấy sự kiện theo slug (dùng cho SEO-friendly URL)
     */
    @Transactional(readOnly = true)
    public EventResponse getEventBySlug(String slug) {
        Event event = eventRepository.findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện với slug: " + slug));
        
        // Không trả về sự kiện đã bị xóa
        if (event.getStatus() == EventStatus.DELETED) {
            throw new RuntimeException("Sự kiện không tồn tại hoặc đã bị xóa!");
        }
        
        return EventResponse.fromEntity(event);
    }

    /**
     * Ngừng bán vé (STOP_SELLING)
     * Chuyển sự kiện từ ACTIVE sang STOP_SELLING
     */
    @Transactional
    public EventResponse stopSelling(UUID eventId, UUID organizerId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện với ID: " + eventId));

        // Kiểm tra quyền sở hữu
        if (!event.getOrganizerId().equals(organizerId)) {
            throw new RuntimeException("Bạn không có quyền thay đổi trạng thái sự kiện này!");
        }

        // Chỉ cho phép ngừng bán khi sự kiện đang ACTIVE
        if (event.getStatus() != EventStatus.ACTIVE) {
            throw new RuntimeException("Chỉ có thể ngừng bán vé khi sự kiện đang ở trạng thái 'Đang bán'!");
        }

        event.setStatus(EventStatus.STOP_SELLING);
        event.setActive(false);

        Event savedEvent = eventRepository.save(event);
        return EventResponse.fromEntity(savedEvent);
    }

    /**
     * Mở lại bán vé (từ STOP_SELLING về ACTIVE)
     */
    @Transactional
    public EventResponse resumeSelling(UUID eventId, UUID organizerId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện với ID: " + eventId));

        // Kiểm tra quyền sở hữu
        if (!event.getOrganizerId().equals(organizerId)) {
            throw new RuntimeException("Bạn không có quyền thay đổi trạng thái sự kiện này!");
        }

        // Chỉ cho phép mở lại khi sự kiện đang STOP_SELLING
        if (event.getStatus() != EventStatus.STOP_SELLING) {
            throw new RuntimeException("Chỉ có thể mở lại bán vé khi sự kiện đang ở trạng thái 'Ngừng bán'!");
        }

        event.setStatus(EventStatus.ACTIVE);
        event.setActive(true);

        Event savedEvent = eventRepository.save(event);
        return EventResponse.fromEntity(savedEvent);
    }

    /**
     * Toggle trạng thái bán vé (ACTIVE <-> STOP_SELLING)
     * Thay thế cho toggleEventSales cũ
     */
    @Transactional
    public EventResponse toggleEventSales(UUID eventId, UUID organizerId, Boolean active) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện với ID: " + eventId));

        // Kiểm tra quyền sở hữu
        if (!event.getOrganizerId().equals(organizerId)) {
            throw new RuntimeException("Bạn không có quyền thay đổi trạng thái sự kiện này!");
        }

        // Chỉ cho phép toggle giữa ACTIVE và STOP_SELLING
        if (event.getStatus() != EventStatus.ACTIVE && event.getStatus() != EventStatus.STOP_SELLING) {
            throw new RuntimeException("Chỉ có thể thay đổi trạng thái bán vé khi sự kiện đang hoạt động!");
        }

        // Xác định trạng thái mới
        boolean shouldBeActive;
        if (active != null) {
            shouldBeActive = active;
        } else {
            // Toggle: nếu đang ACTIVE -> STOP_SELLING, ngược lại
            shouldBeActive = event.getStatus() == EventStatus.STOP_SELLING;
        }

        if (shouldBeActive) {
            event.setStatus(EventStatus.ACTIVE);
            event.setActive(true);
        } else {
            event.setStatus(EventStatus.STOP_SELLING);
            event.setActive(false);
        }

        Event savedEvent = eventRepository.save(event);
        return EventResponse.fromEntity(savedEvent);
    }

    /**
     * Hủy sự kiện (CANCELLED) - Dùng khi đã bán vé và cần hoàn tiền
     * Chỉ Admin hoặc Organizer có thể hủy
     */
    @Transactional
    public EventResponse cancelEvent(UUID eventId, UUID userId, boolean isAdmin, String reason) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện với ID: " + eventId));

        // Kiểm tra quyền
        if (!isAdmin && !event.getOrganizerId().equals(userId)) {
            throw new RuntimeException("Bạn không có quyền hủy sự kiện này!");
        }

        // Không cho hủy sự kiện đã hoàn thành hoặc đã xóa
        if (event.getStatus() == EventStatus.COMPLETED) {
            throw new RuntimeException("Không thể hủy sự kiện đã kết thúc!");
        }
        if (event.getStatus() == EventStatus.DELETED) {
            throw new RuntimeException("Sự kiện không tồn tại!");
        }
        if (event.getStatus() == EventStatus.CANCELLED) {
            throw new RuntimeException("Sự kiện đã bị hủy trước đó!");
        }

        event.setStatus(EventStatus.CANCELLED);
        event.setActive(false);
        event.setRejectionReason(reason); // Lưu lý do hủy

        // TODO: Kích hoạt quy trình hoàn tiền nếu đã có vé được bán

        Event savedEvent = eventRepository.save(event);
        return EventResponse.fromEntity(savedEvent);
    }
}
