package com.ticket.controller;

import com.ticket.dto.*;
import com.ticket.entity.Event;
import com.ticket.entity.Order;
import com.ticket.entity.Ticket;
import com.ticket.entity.User;
import com.ticket.repository.EventRepository;
import com.ticket.repository.OrderRepository;
import com.ticket.repository.TicketRepository;
import com.ticket.repository.UserRepository;
import com.ticket.security.UserDetailsImpl;
import com.ticket.service.TicketService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Controller cho các API dành riêng cho Organizer
 * Quản lý đơn hàng và vé của sự kiện
 */
@RestController
@RequestMapping("/api/organizer")
@PreAuthorize("hasRole('ORGANIZER')")
@RequiredArgsConstructor
@Slf4j
public class OrganizerController {

    private final EventRepository eventRepository;
    private final OrderRepository orderRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final TicketService ticketService;

    // Helper method để lấy organizer ID từ token
    private UUID getOrganizerId(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return userDetails.getId();
    }

    // Helper method để kiểm tra event có thuộc về organizer không
    private Event getOrganizerEvent(UUID eventId, UUID organizerId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện với ID: " + eventId));
        
        if (!event.getOrganizerId().equals(organizerId)) {
            throw new RuntimeException("Bạn không có quyền truy cập sự kiện này");
        }
        return event;
    }

    // ==================== ORDER ENDPOINTS ====================

    /**
     * Lấy tất cả đơn hàng của tất cả sự kiện của organizer
     * GET /api/organizer/orders
     */
    @GetMapping("/orders")
    public ResponseEntity<List<OrderWithTicketsResponse>> getAllOrganizerOrders(Authentication authentication) {
        UUID organizerId = getOrganizerId(authentication);
        log.info("Lấy tất cả đơn hàng của organizer: {}", organizerId);

        // Lấy tất cả events của organizer
        List<Event> myEvents = eventRepository.findByOrganizerIdOrderByCreatedAtDesc(organizerId);
        
        // Lấy tất cả orders của các events đó
        List<OrderWithTicketsResponse> allOrders = myEvents.stream()
                .flatMap(event -> orderRepository.findByEventId(event.getId()).stream()
                        .map(order -> mapToOrderWithTickets(order, event)))
                .collect(Collectors.toList());

        log.info("Tìm thấy {} đơn hàng cho organizer {}", allOrders.size(), organizerId);
        return ResponseEntity.ok(allOrders);
    }

    /**
     * Lấy đơn hàng của một sự kiện cụ thể
     * GET /api/organizer/events/{eventId}/orders
     */
    @GetMapping("/events/{eventId}/orders")
    public ResponseEntity<List<OrderWithTicketsResponse>> getEventOrders(
            @PathVariable UUID eventId,
            Authentication authentication) {
        UUID organizerId = getOrganizerId(authentication);
        log.info("Lấy đơn hàng của sự kiện {} bởi organizer {}", eventId, organizerId);

        // Kiểm tra quyền sở hữu event
        Event event = getOrganizerEvent(eventId, organizerId);

        // Lấy orders của event
        List<Order> orders = orderRepository.findByEventId(eventId);
        List<OrderWithTicketsResponse> result = orders.stream()
                .map(order -> mapToOrderWithTickets(order, event))
                .collect(Collectors.toList());

        log.info("Tìm thấy {} đơn hàng cho sự kiện {}", result.size(), eventId);
        return ResponseEntity.ok(result);
    }

    // ==================== TICKET ENDPOINTS ====================

    /**
     * Lấy tất cả vé của một sự kiện
     * GET /api/organizer/events/{eventId}/tickets
     */
    @GetMapping("/events/{eventId}/tickets")
    public ResponseEntity<List<TicketResponse>> getEventTickets(
            @PathVariable UUID eventId,
            Authentication authentication) {
        UUID organizerId = getOrganizerId(authentication);
        log.info("Lấy danh sách vé của sự kiện {} bởi organizer {}", eventId, organizerId);

        // Kiểm tra quyền sở hữu event
        getOrganizerEvent(eventId, organizerId);

        // Lấy tickets của event
        List<Ticket> tickets = ticketRepository.findByEventIdOrderByCreatedAtDesc(eventId);
        List<TicketResponse> result = tickets.stream()
                .map(TicketResponse::fromEntity)
                .collect(Collectors.toList());

        log.info("Tìm thấy {} vé cho sự kiện {}", result.size(), eventId);
        return ResponseEntity.ok(result);
    }

    /**
     * Tìm kiếm vé theo nhiều tiêu chí
     * GET /api/organizer/tickets/search
     */
    @GetMapping("/tickets/search")
    public ResponseEntity<List<TicketResponse>> searchTickets(
            @RequestParam(required = false) UUID eventId,
            @RequestParam(required = false) String ticketCode,
            @RequestParam(required = false) String buyerEmail,
            @RequestParam(required = false) String buyerPhone,
            @RequestParam(required = false) String status,
            Authentication authentication) {
        UUID organizerId = getOrganizerId(authentication);
        log.info("🔍 Tìm kiếm vé - eventId: {}, code: {}, email: {}", eventId, ticketCode, buyerEmail);

        // Nếu có eventId, kiểm tra quyền sở hữu
        if (eventId != null) {
            getOrganizerEvent(eventId, organizerId);
        }

        // Lấy tất cả events của organizer
        List<UUID> myEventIds = eventRepository.findByOrganizerIdOrderByCreatedAtDesc(organizerId)
                .stream()
                .map(Event::getId)
                .collect(Collectors.toList());

        // Tìm kiếm tickets
        List<Ticket> tickets = ticketRepository.findByEventIdOrderByCreatedAtDesc(
                eventId != null ? eventId : myEventIds.get(0)); // Simplified search

        // Filter thêm nếu cần
        List<TicketResponse> result = tickets.stream()
                .filter(t -> eventId == null || t.getEvent().getId().equals(eventId))
                .filter(t -> ticketCode == null || t.getTicketCode().toLowerCase().contains(ticketCode.toLowerCase()))
                .filter(t -> buyerEmail == null || (t.getHolderEmail() != null && t.getHolderEmail().toLowerCase().contains(buyerEmail.toLowerCase())))
                .filter(t -> buyerPhone == null || (t.getHolderPhone() != null && t.getHolderPhone().contains(buyerPhone)))
                .filter(t -> status == null || t.getStatus().name().equals(status))
                .map(TicketResponse::fromEntity)
                .collect(Collectors.toList());

        log.info("Tìm thấy {} vé phù hợp", result.size());
        return ResponseEntity.ok(result);
    }

    // ==================== HELPER METHODS ====================

    /**
     * Map Order entity sang OrderWithTicketsResponse
     */
    private OrderWithTicketsResponse mapToOrderWithTickets(Order order, Event event) {
        // Lấy tickets của order này
        List<Ticket> tickets = ticketRepository.findByOrderId(order.getId());
        
        // Lấy thông tin customer từ User entity
        User customer = userRepository.findById(order.getCustomerId()).orElse(null);
        String customerName = customer != null ? customer.getFullName() : "N/A";
        String customerEmail = customer != null ? customer.getEmail() : "N/A";
        String customerPhone = customer != null ? customer.getPhoneNumber() : null;
        
        return OrderWithTicketsResponse.builder()
                .orderId(order.getId().toString())
                .eventId(event.getId().toString())
                .eventName(event.getName())
                .eventDate(event.getEventDate() != null ? event.getEventDate().toString() : null)
                .eventLocation(event.getLocation())
                .totalPrice(order.getTotalPrice() != null ? order.getTotalPrice().doubleValue() : 0)
                .status(order.getStatus() != null ? order.getStatus().name() : null)
                .paymentStatus(order.getPaymentStatus() != null ? order.getPaymentStatus().name() : null)
                .createdAt(order.getCreatedAt() != null ? order.getCreatedAt().toString() : null)
                .buyerInfo(OrderWithTicketsResponse.BuyerInfo.builder()
                        .name(customerName)
                        .email(customerEmail)
                        .phone(customerPhone)
                        .build())
                .tickets(tickets.stream()
                        .map(TicketResponse::fromEntity)
                        .collect(Collectors.toList()))
                .build();
    }
}
