package com.ticket.service;

import com.ticket.dto.CheckInResponse;
import com.ticket.dto.NotificationMessage;
import com.ticket.dto.TicketResponse;
import com.ticket.dto.TicketTypeRequest;
import com.ticket.dto.TicketTypeResponse;
import com.ticket.entity.*;
import com.ticket.repository.EventRepository;
import com.ticket.repository.OrderRepository;
import com.ticket.repository.TicketRepository;
import com.ticket.repository.TicketTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TicketService {

    private final TicketRepository ticketRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final EventRepository eventRepository;
    private final OrderRepository orderRepository;
    private final QRCodeService qrCodeService;
    private final NotificationService notificationService;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    // ==================== TICKET TYPE MANAGEMENT ====================

    /**
     * Tạo loại vé mới cho sự kiện
     * @param request Thông tin loại vé
     * @param currentUserId ID của user hiện tại
     * @param isAdmin User có phải admin không
     */
    @Transactional
    public TicketTypeResponse createTicketType(TicketTypeRequest request, UUID currentUserId, boolean isAdmin) {
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện với ID: " + request.getEventId()));

        // Kiểm tra quyền sở hữu: Chỉ organizer sở hữu event hoặc admin mới được tạo ticket type
        if (!isAdmin && !event.getOrganizerId().equals(currentUserId)) {
            throw new RuntimeException("Bạn không có quyền tạo loại vé cho sự kiện này!");
        }

        // Kiểm tra trùng tên loại vé trong cùng sự kiện
        if (ticketTypeRepository.findByEventIdAndName(request.getEventId(), request.getName()).isPresent()) {
            throw new RuntimeException("Loại vé '" + request.getName() + "' đã tồn tại trong sự kiện này");
        }

        TicketType.SeatingType seatingType = TicketType.SeatingType.ZONE_ONLY;
        if (request.getSeatingType() != null) {
            try {
                seatingType = TicketType.SeatingType.valueOf(request.getSeatingType());
            } catch (IllegalArgumentException e) {
                log.warn("SeatingType không hợp lệ '{}', sử dụng mặc định ZONE_ONLY", request.getSeatingType());
            }
        }

        validateSeatingConfiguration(seatingType, request);

        TicketType ticketType = TicketType.builder()
                .event(event)
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .totalQuantity(request.getTotalQuantity())
                .availableQuantity(request.getTotalQuantity())
                .seatingType(seatingType)
                .zoneName(request.getZoneName())
                .zoneDescription(request.getZoneDescription())
                .rowLabels(request.getRowLabels())
                .seatsPerRow(request.getSeatsPerRow())
                .allowSeatSelection(request.getAllowSeatSelection() != null ? request.getAllowSeatSelection() : false)
                .colorCode(request.getColorCode())
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .isActive(true)
                .build();

        ticketType = ticketTypeRepository.save(ticketType);
        updateEventTotalTickets(event.getId());

        log.info("Đã tạo loại vé '{}' (seatingType={}) cho sự kiện '{}'", 
                ticketType.getName(), seatingType, event.getName());
        return TicketTypeResponse.fromEntity(ticketType);
    }

    private void validateSeatingConfiguration(TicketType.SeatingType seatingType, TicketTypeRequest request) {
        switch (seatingType) {
            case ZONE_WITH_ROW:
                if (request.getRowLabels() == null || request.getRowLabels().isEmpty()) {
                    throw new RuntimeException("SeatingType ZONE_WITH_ROW yêu cầu phải có rowLabels");
                }
                break;
            case FULL_SEAT:
                if (request.getRowLabels() == null || request.getRowLabels().isEmpty()) {
                    throw new RuntimeException("SeatingType FULL_SEAT yêu cầu phải có rowLabels");
                }
                if (request.getSeatsPerRow() == null || request.getSeatsPerRow() <= 0) {
                    throw new RuntimeException("SeatingType FULL_SEAT yêu cầu phải có seatsPerRow > 0");
                }
                break;
            case ZONE_ONLY:
            default:
                break;
        }
    }

    /**
     * Lấy danh sách loại vé của sự kiện
     */
    public List<TicketTypeResponse> getTicketTypesByEvent(UUID eventId) {
        return ticketTypeRepository.findByEventIdAndIsActiveTrueOrderByDisplayOrderAsc(eventId)
                .stream()
                .map(TicketTypeResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Lấy loại vé còn vé khả dụng
     */
    public List<TicketTypeResponse> getAvailableTicketTypes(UUID eventId) {
        return ticketTypeRepository.findAvailableByEventId(eventId)
                .stream()
                .map(TicketTypeResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public List<TicketResponse> generateTicketsForOrder(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng với ID: " + orderId));

        if (order.getPaymentStatus() != Order.PaymentStatus.PAID) {
            throw new RuntimeException("Đơn hàng chưa được thanh toán");
        }

        List<Ticket> existingTickets = ticketRepository.findByOrderId(orderId);
        if (!existingTickets.isEmpty()) {
            log.warn("Đơn hàng {} đã có vé, trả về vé hiện có", orderId);
            log.warn("Đơn hàng {} đã có vé, trả về vé hiện có", orderId);
            return existingTickets.stream()
                    .map(this::convertToResponse)
                    .collect(Collectors.toList());
        }

        Event event = eventRepository.findById(order.getEventId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện"));

        TicketType ticketType = ticketTypeRepository.findAvailableByEventId(event.getId())
                .stream()
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Không có loại vé khả dụng"));

        List<Ticket> tickets = new ArrayList<>();
        int quantity = order.getTicketQuantity();

        for (int i = 1; i <= quantity; i++) {
            Ticket ticket = createTicket(order, event, ticketType, i);
            tickets.add(ticket);
        }

        tickets = ticketRepository.saveAll(tickets);
        log.info("Đã tạo {} vé cho đơn hàng {}", tickets.size(), orderId);
        log.info("Đã tạo {} vé cho đơn hàng {}", tickets.size(), orderId);

        return tickets.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    private Ticket createTicket(Order order, Event event, TicketType ticketType, int sequenceNumber) {
        String ticketCode = generateTicketCode(event.getId(), order.getId(), sequenceNumber);
        String qrData = qrCodeService.buildTicketQRContent(ticketCode, event.getId(), order.getId());

        Ticket.TicketBuilder builder = Ticket.builder()
                .ticketCode(ticketCode)
                .qrData(qrData)
                .order(order)
                .event(event)
                .ticketType(ticketType)
                .zoneName(ticketType.getZoneName())
                .sequenceNumber(sequenceNumber)
                .status(Ticket.TicketStatus.ACTIVE);

        TicketType.SeatingType seatingType = ticketType.getSeatingType();
        if (seatingType != null && seatingType != TicketType.SeatingType.ZONE_ONLY) {
            if (!Boolean.TRUE.equals(ticketType.getAllowSeatSelection())) {
                SeatAssignment seat = autoAssignSeat(ticketType, sequenceNumber);
                if (seat != null) {
                    builder.rowName(seat.rowName);
                    if (seatingType == TicketType.SeatingType.FULL_SEAT) {
                        builder.seatNumber(seat.seatNumber);
                    }
                }
            }
        }

        return builder.build();
    }

    private SeatAssignment autoAssignSeat(TicketType ticketType, int sequenceNumber) {
        if (ticketType.getRowLabels() == null || ticketType.getRowLabels().isEmpty()) {
            return null;
        }

        String[] rows = ticketType.getRowLabels().split(",");
        if (rows.length == 0) {
            return null;
        }

        SeatAssignment assignment = new SeatAssignment();

        if (ticketType.getSeatingType() == TicketType.SeatingType.ZONE_WITH_ROW) {
            int rowIndex = (sequenceNumber - 1) % rows.length;
            assignment.rowName = rows[rowIndex].trim();
        } else if (ticketType.getSeatingType() == TicketType.SeatingType.FULL_SEAT) {
            int seatsPerRow = ticketType.getSeatsPerRow() != null ? ticketType.getSeatsPerRow() : 10;
            int rowIndex = (sequenceNumber - 1) / seatsPerRow;
            int seatIndex = (sequenceNumber - 1) % seatsPerRow + 1;

            if (rowIndex < rows.length) {
                assignment.rowName = rows[rowIndex].trim();
                assignment.seatNumber = String.valueOf(seatIndex);
            } else {
                rowIndex = rowIndex % rows.length;
                assignment.rowName = rows[rowIndex].trim();
                assignment.seatNumber = String.valueOf(seatIndex);
            }
        }

        return assignment;
    }

    private static class SeatAssignment {
        String rowName;
        String seatNumber;
    }

    /**
     * Sinh mã vé duy nhất
     * Format: E{eventId}O{orderId}T{timestamp}S{sequence}
     */
    private String generateTicketCode(UUID eventId, UUID orderId, int sequence) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String uuid = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return String.format("E%sO%sT%sS%d%s", eventId.toString().substring(0, 8), orderId.toString().substring(0, 8), timestamp, sequence, uuid);
    }

    // ==================== TICKET RETRIEVAL ====================

    /**
     * Lấy thông tin vé theo ID
     */
    public TicketResponse getTicketById(UUID ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vé với ID: " + ticketId));
        return convertToResponse(ticket);
    }

    /**
     * Lấy thông tin vé theo mã vé hoặc UUID id
     */
    public TicketResponse getTicketByCode(String ticketCode) {
        String cleanedCode = ticketCode != null ? ticketCode.trim() : "";
        
        Ticket ticket = findTicketByCodeOrId(cleanedCode);
        if (ticket == null) {
            throw new RuntimeException("Không tìm thấy vé với mã: " + cleanedCode);
        }
        return convertToResponse(ticket);
    }

    /**
     * Lấy danh sách vé của đơn hàng
     */
    public List<TicketResponse> getTicketsByOrder(UUID orderId) {
        return ticketRepository.findByOrderId(orderId)
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy danh sách vé của khách hàng
     */
    public List<TicketResponse> getTicketsByCustomer(UUID customerId) {
        return ticketRepository.findByCustomerId(customerId)
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy danh sách vé của khách hàng cho một sự kiện
     */
    public List<TicketResponse> getTicketsByCustomerAndEvent(UUID customerId, UUID eventId) {
        return ticketRepository.findByCustomerIdAndEventId(customerId, eventId)
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // ==================== TICKET CHECK-IN ====================

    /**
     * Helper method để tìm vé theo ticketCode hoặc UUID id
     * Thứ tự ưu tiên:
     * 1. Exact match ticketCode
     * 2. Case-insensitive ticketCode
     * 3. Nếu input là UUID format -> tìm theo id
     */
    private Ticket findTicketByCodeOrId(String input) {
        // 1. Thử exact match ticketCode
        return ticketRepository.findByTicketCode(input)
                .or(() -> {
                    // 2. Thử case-insensitive
                    log.debug("🔄 Exact match không tìm thấy, thử case-insensitive...");
                    return ticketRepository.findByTicketCodeIgnoreCase(input);
                })
                .or(() -> {
                    // 3. Thử parse như UUID và tìm theo id
                    try {
                        UUID ticketId = UUID.fromString(input);
                        log.debug("🔄 Thử tìm theo UUID id: {}", ticketId);
                        return ticketRepository.findById(ticketId);
                    } catch (IllegalArgumentException e) {
                        // Không phải UUID format, bỏ qua
                        return java.util.Optional.empty();
                    }
                })
                .orElse(null);
    }

    /**
     * Check-in vé (quét QR tại sự kiện)
     * Hỗ trợ tìm kiếm theo ticketCode hoặc UUID id
     */
    @Transactional
    public TicketResponse checkInTicket(String ticketCode, UUID staffId) {
        // Trim whitespace từ input
        String cleanedCode = ticketCode != null ? ticketCode.trim() : "";
        
        if (cleanedCode.isEmpty()) {
            throw new RuntimeException("Mã vé không được để trống");
        }
        
        // Tìm vé theo ticketCode hoặc UUID id
        Ticket ticket = findTicketByCodeOrId(cleanedCode);
        if (ticket == null) {
            throw new RuntimeException("Mã vé không hợp lệ: " + cleanedCode);
        }

        if (ticket.getStatus() == Ticket.TicketStatus.USED) {
            throw new RuntimeException("Vé đã được sử dụng lúc: " + ticket.getCheckedInAt());
        }

        if (ticket.getStatus() != Ticket.TicketStatus.ACTIVE) {
            throw new RuntimeException("Vé không hợp lệ. Trạng thái hiện tại: " + ticket.getStatus());
        }

        LocalDateTime now = LocalDateTime.now();
        Event event = ticket.getEvent();
        LocalDateTime eventDate = event.getEventDate();
        if (now.isBefore(eventDate.minusHours(2))) {
            throw new RuntimeException("Chưa đến thời gian check-in. Sự kiện bắt đầu lúc: " + eventDate);
        }

        // Kiểm tra sự kiện đã kết thúc chưa (trạng thái COMPLETED hoặc đã qua eventEndDate)
        if (event.getStatus() == EventStatus.COMPLETED) {
            throw new RuntimeException("Vé đã hết hạn. Sự kiện đã kết thúc.");
        }
        if (event.getEventEndDate() != null && now.isAfter(event.getEventEndDate())) {
            throw new RuntimeException("Vé đã hết hạn. Sự kiện kết thúc lúc: " + event.getEventEndDate());
        }

        // Cập nhật trạng thái
        ticket.setStatus(Ticket.TicketStatus.USED);
        ticket.setCheckedInAt(now);
        ticket.setCheckedInBy(staffId);

        ticket = ticketRepository.save(ticket);
        log.info("Check-in thành công vé {} cho sự kiện {}", cleanedCode, event.getName());

        return convertToResponse(ticket);
    }

    /**
     * Check-in vé và trả về CheckInResponse
     * Hỗ trợ tìm kiếm theo ticketCode hoặc UUID id
     */
    @Transactional
    public CheckInResponse checkInTicketWithResponse(String ticketCode, UUID staffId) {
        // Trim whitespace từ input
        String cleanedCode = ticketCode != null ? ticketCode.trim() : "";
        log.info("🔍 Check-in request với mã vé: '{}' (original: '{}')", cleanedCode, ticketCode);
        
        if (cleanedCode.isEmpty()) {
            log.warn("❌ Mã vé rỗng");
            return CheckInResponse.failure("Mã vé không được để trống");
        }
        
        // Tìm vé - thử các cách khác nhau
        Ticket ticket = findTicketByCodeOrId(cleanedCode);
        
        if (ticket == null) {
            log.warn("❌ Không tìm thấy vé với mã: '{}'", cleanedCode);
            return CheckInResponse.failure("Mã vé không hợp lệ: " + cleanedCode);
        }
        
        log.info("✅ Tìm thấy vé: id={}, ticketCode={}, status={}", 
                ticket.getId(), ticket.getTicketCode(), ticket.getStatus());

        // Kiểm tra trạng thái vé
        if (ticket.getStatus() == Ticket.TicketStatus.USED) {
            return CheckInResponse.failure(
                "Vé đã được sử dụng lúc: " + ticket.getCheckedInAt(),
                ticket
            );
        }

        if (ticket.getStatus() != Ticket.TicketStatus.ACTIVE) {
            return CheckInResponse.failure(
                "Vé không hợp lệ. Trạng thái hiện tại: " + ticket.getStatus(),
                ticket
            );
        }

        // Kiểm tra sự kiện đã bắt đầu chưa (cho phép check-in trước 2 giờ)
        LocalDateTime now = LocalDateTime.now();
        Event event = ticket.getEvent();
        LocalDateTime eventDate = event.getEventDate();
        if (now.isBefore(eventDate.minusHours(2))) {
            return CheckInResponse.failure(
                "Chưa đến thời gian check-in. Sự kiện bắt đầu lúc: " + eventDate,
                ticket
            );
        }

        // Kiểm tra sự kiện đã kết thúc chưa (trạng thái COMPLETED hoặc đã qua eventEndDate)
        if (event.getStatus() == EventStatus.COMPLETED) {
            return CheckInResponse.failure(
                "Vé đã hết hạn. Sự kiện đã kết thúc.",
                ticket
            );
        }
        if (event.getEventEndDate() != null && now.isAfter(event.getEventEndDate())) {
            return CheckInResponse.failure(
                "Vé đã hết hạn. Sự kiện kết thúc lúc: " + event.getEventEndDate(),
                ticket
            );
        }

        // Cập nhật trạng thái
        ticket.setStatus(Ticket.TicketStatus.USED);
        ticket.setCheckedInAt(now);
        ticket.setCheckedInBy(staffId);

        ticket = ticketRepository.save(ticket);
        log.info("Check-in thành công vé {} cho sự kiện {}", cleanedCode, event.getName());

        // Gửi notification realtime tới user sở hữu vé
        try {
            UUID ticketOwnerId = ticket.getOrder().getCustomerId();
            NotificationMessage notification = NotificationMessage.ticketCheckedIn(
                    ticket.getId(),
                    ticket.getTicketCode(),
                    ticket.getEvent().getName(),
                    now
            );
            notificationService.sendToUser(ticketOwnerId, notification);
            log.info("📤 Đã gửi notification check-in tới user {}", ticketOwnerId);
        } catch (Exception e) {
            // Không để lỗi notification ảnh hưởng tới check-in
            log.warn("⚠️ Không thể gửi notification check-in: {}", e.getMessage());
        }

        return CheckInResponse.success(ticket, "Check-in thành công!");
    }

    /**
     * Verify vé (kiểm tra thông tin không thay đổi trạng thái)
     * Hỗ trợ tìm kiếm theo ticketCode hoặc UUID id
     */
    public TicketResponse verifyTicket(String ticketCode) {
        String cleanedCode = ticketCode != null ? ticketCode.trim() : "";
        
        Ticket ticket = findTicketByCodeOrId(cleanedCode);
        if (ticket == null) {
            throw new RuntimeException("Mã vé không hợp lệ: " + cleanedCode);
        }
        return convertToResponse(ticket);
    }

    @Transactional
    public TicketResponse cancelTicket(UUID ticketId, String reason) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vé"));

        if (ticket.getStatus() == Ticket.TicketStatus.USED) {
            throw new RuntimeException("Không thể hủy vé đã sử dụng");
        }

        if (ticket.getStatus() == Ticket.TicketStatus.CANCELLED) {
            throw new RuntimeException("Vé đã bị hủy trước đó");
        }

        ticket.setStatus(Ticket.TicketStatus.CANCELLED);
        ticket = ticketRepository.save(ticket);

        TicketType ticketType = ticket.getTicketType();
        ticketType.increaseAvailableQuantity(1);
        ticketTypeRepository.save(ticketType);

        updateEventTotalTickets(ticket.getEvent().getId());

        log.info("Đã hủy vé {} với lý do: {}", ticket.getTicketCode(), reason);
        log.info("Đã hủy vé {} với lý do: {}", ticket.getTicketCode(), reason);
        return convertToResponse(ticket);
    }

    // ==================== STATISTICS ====================

    /**
     * Thống kê vé của sự kiện
     */
    public TicketStatistics getEventTicketStatistics(UUID eventId) {
        Long totalActive = ticketRepository.countActiveByEventId(eventId);
        Long totalCheckedIn = ticketRepository.countCheckedInByEventId(eventId);
        Integer totalAvailable = ticketTypeRepository.sumAvailableQuantityByEventId(eventId);
        Integer totalQuantity = ticketTypeRepository.sumTotalQuantityByEventId(eventId);

        return TicketStatistics.builder()
                .eventId(eventId)
                .totalTickets(totalQuantity)
                .soldTickets(totalQuantity - totalAvailable)
                .availableTickets(totalAvailable)
                .activeTickets(totalActive.intValue())
                .checkedInTickets(totalCheckedIn.intValue())
                .build();
    }

    private TicketResponse convertToResponse(Ticket ticket) {
        String qrCodeBase64 = qrCodeService.generateQRCodeBase64(ticket.getQrData());
        return TicketResponse.fromEntity(ticket, qrCodeBase64);
    }

    /**
     * Cập nhật tổng số vé của sự kiện
     */
    private void updateEventTotalTickets(UUID eventId) {
        Event event = eventRepository.findById(eventId).orElse(null);
        if (event != null) {
            Integer totalAvailable = ticketTypeRepository.sumAvailableQuantityByEventId(eventId);
            Integer total = ticketTypeRepository.sumTotalQuantityByEventId(eventId);
            event.setAvailableTickets(totalAvailable);
            event.setTotalTickets(total);
            eventRepository.save(event);
        }
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class TicketStatistics {
        private UUID eventId;
        private Integer totalTickets;
        private Integer soldTickets;
        private Integer availableTickets;
        private Integer activeTickets;
        private Integer checkedInTickets;
    }
}
