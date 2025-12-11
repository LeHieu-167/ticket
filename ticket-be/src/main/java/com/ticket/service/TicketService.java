package com.ticket.service;

import com.ticket.dto.TicketRequest;
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

/**
 * Service quản lý vé điện tử
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TicketService {

    private final TicketRepository ticketRepository;
    private final TicketTypeRepository ticketTypeRepository;
    private final EventRepository eventRepository;
    private final OrderRepository orderRepository;
    private final QRCodeService qrCodeService;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    // ==================== TICKET TYPE MANAGEMENT ====================

    /**
     * Tạo loại vé mới cho sự kiện
     */
    @Transactional
    public TicketTypeResponse createTicketType(TicketTypeRequest request) {
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện với ID: " + request.getEventId()));

        // Kiểm tra trùng tên loại vé trong cùng sự kiện
        if (ticketTypeRepository.findByEventIdAndName(request.getEventId(), request.getName()).isPresent()) {
            throw new RuntimeException("Loại vé '" + request.getName() + "' đã tồn tại trong sự kiện này");
        }

        // Parse seating type
        TicketType.SeatingType seatingType = TicketType.SeatingType.ZONE_ONLY;
        if (request.getSeatingType() != null) {
            try {
                seatingType = TicketType.SeatingType.valueOf(request.getSeatingType());
            } catch (IllegalArgumentException e) {
                log.warn("⚠️ SeatingType không hợp lệ '{}', sử dụng mặc định ZONE_ONLY", request.getSeatingType());
            }
        }

        // Validate seating configuration
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

        // Cập nhật tổng số vé của sự kiện
        updateEventTotalTickets(event.getId());

        log.info("✅ Đã tạo loại vé '{}' (seatingType={}) cho sự kiện '{}'", 
                ticketType.getName(), seatingType, event.getName());
        return TicketTypeResponse.fromEntity(ticketType);
    }

    /**
     * Validate cấu hình chỗ ngồi dựa trên seatingType
     */
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
                // Không cần validate thêm
                break;
        }
    }

    /**
     * Lấy danh sách loại vé của sự kiện
     */
    public List<TicketTypeResponse> getTicketTypesByEvent(Long eventId) {
        return ticketTypeRepository.findByEventIdAndIsActiveTrueOrderByDisplayOrderAsc(eventId)
                .stream()
                .map(TicketTypeResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Lấy loại vé còn vé khả dụng
     */
    public List<TicketTypeResponse> getAvailableTicketTypes(Long eventId) {
        return ticketTypeRepository.findAvailableByEventId(eventId)
                .stream()
                .map(TicketTypeResponse::fromEntity)
                .collect(Collectors.toList());
    }

    // ==================== TICKET GENERATION ====================

    /**
     * Tạo vé sau khi thanh toán thành công
     * Được gọi từ OrderService hoặc PaymentService
     */
    @Transactional
    public List<TicketResponse> generateTicketsForOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng với ID: " + orderId));

        // Kiểm tra đơn hàng đã thanh toán chưa
        if (order.getPaymentStatus() != Order.PaymentStatus.PAID) {
            throw new RuntimeException("Đơn hàng chưa được thanh toán");
        }

        // Kiểm tra đã tạo vé chưa
        List<Ticket> existingTickets = ticketRepository.findByOrderId(orderId);
        if (!existingTickets.isEmpty()) {
            log.warn("⚠️ Đơn hàng {} đã có vé, trả về vé hiện có", orderId);
            return existingTickets.stream()
                    .map(this::convertToResponse)
                    .collect(Collectors.toList());
        }

        Event event = eventRepository.findById(order.getEventId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sự kiện"));

        // Lấy loại vé mặc định (loại đầu tiên có sẵn)
        // TODO: Trong tương lai, cần lưu ticketTypeId trong Order
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
        log.info("✅ Đã tạo {} vé cho đơn hàng {}", tickets.size(), orderId);

        return tickets.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Tạo một vé với thông tin vị trí dựa trên SeatingType
     */
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

        // Gán thông tin vị trí dựa trên seatingType
        TicketType.SeatingType seatingType = ticketType.getSeatingType();
        if (seatingType != null && seatingType != TicketType.SeatingType.ZONE_ONLY) {
            // Tự động gán hàng và ghế nếu không cho phép user chọn
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

    /**
     * Tự động gán ghế dựa trên số thứ tự và cấu hình loại vé
     */
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
            // Chỉ gán hàng, phân bổ đều vào các hàng
            int rowIndex = (sequenceNumber - 1) % rows.length;
            assignment.rowName = rows[rowIndex].trim();
        } else if (ticketType.getSeatingType() == TicketType.SeatingType.FULL_SEAT) {
            // Gán cả hàng và ghế
            int seatsPerRow = ticketType.getSeatsPerRow() != null ? ticketType.getSeatsPerRow() : 10;
            int rowIndex = (sequenceNumber - 1) / seatsPerRow;
            int seatIndex = (sequenceNumber - 1) % seatsPerRow + 1;

            if (rowIndex < rows.length) {
                assignment.rowName = rows[rowIndex].trim();
                assignment.seatNumber = String.valueOf(seatIndex);
            } else {
                // Nếu vượt quá số hàng, quay lại hàng đầu
                rowIndex = rowIndex % rows.length;
                assignment.rowName = rows[rowIndex].trim();
                assignment.seatNumber = String.valueOf(seatIndex);
            }
        }

        return assignment;
    }

    /**
     * Helper class cho việc gán ghế
     */
    private static class SeatAssignment {
        String rowName;
        String seatNumber;
    }

    /**
     * Sinh mã vé duy nhất
     * Format: E{eventId}O{orderId}T{timestamp}S{sequence}
     */
    private String generateTicketCode(Long eventId, Long orderId, int sequence) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String uuid = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return String.format("E%dO%dT%sS%d%s", eventId, orderId, timestamp, sequence, uuid);
    }

    // ==================== TICKET RETRIEVAL ====================

    /**
     * Lấy thông tin vé theo ID
     */
    public TicketResponse getTicketById(Long ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vé với ID: " + ticketId));
        return convertToResponse(ticket);
    }

    /**
     * Lấy thông tin vé theo mã vé
     */
    public TicketResponse getTicketByCode(String ticketCode) {
        Ticket ticket = ticketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vé với mã: " + ticketCode));
        return convertToResponse(ticket);
    }

    /**
     * Lấy danh sách vé của đơn hàng
     */
    public List<TicketResponse> getTicketsByOrder(Long orderId) {
        return ticketRepository.findByOrderId(orderId)
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy danh sách vé của khách hàng
     */
    public List<TicketResponse> getTicketsByCustomer(Long customerId) {
        return ticketRepository.findByCustomerId(customerId)
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy danh sách vé của khách hàng cho một sự kiện
     */
    public List<TicketResponse> getTicketsByCustomerAndEvent(Long customerId, Long eventId) {
        return ticketRepository.findByCustomerIdAndEventId(customerId, eventId)
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // ==================== TICKET CHECK-IN ====================

    /**
     * Check-in vé (quét QR tại sự kiện)
     */
    @Transactional
    public TicketResponse checkInTicket(String ticketCode, Long staffId) {
        Ticket ticket = ticketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new RuntimeException("Mã vé không hợp lệ: " + ticketCode));

        // Kiểm tra trạng thái vé
        if (ticket.getStatus() == Ticket.TicketStatus.USED) {
            throw new RuntimeException("Vé đã được sử dụng lúc: " + ticket.getCheckedInAt());
        }

        if (ticket.getStatus() != Ticket.TicketStatus.ACTIVE) {
            throw new RuntimeException("Vé không hợp lệ. Trạng thái hiện tại: " + ticket.getStatus());
        }

        // Kiểm tra sự kiện đã bắt đầu chưa (cho phép check-in trước 2 giờ)
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime eventDate = ticket.getEvent().getEventDate();
        if (now.isBefore(eventDate.minusHours(2))) {
            throw new RuntimeException("Chưa đến thời gian check-in. Sự kiện bắt đầu lúc: " + eventDate);
        }

        // Cập nhật trạng thái
        ticket.setStatus(Ticket.TicketStatus.USED);
        ticket.setCheckedInAt(now);
        ticket.setCheckedInBy(staffId);

        ticket = ticketRepository.save(ticket);
        log.info("✅ Check-in thành công vé {} cho sự kiện {}", ticketCode, ticket.getEvent().getName());

        return convertToResponse(ticket);
    }

    /**
     * Verify vé (kiểm tra thông tin không thay đổi trạng thái)
     */
    public TicketResponse verifyTicket(String ticketCode) {
        Ticket ticket = ticketRepository.findByTicketCode(ticketCode)
                .orElseThrow(() -> new RuntimeException("Mã vé không hợp lệ: " + ticketCode));
        return convertToResponse(ticket);
    }

    // ==================== TICKET CANCELLATION ====================

    /**
     * Hủy vé
     */
    @Transactional
    public TicketResponse cancelTicket(Long ticketId, String reason) {
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

        // Hoàn lại số lượng vé
        TicketType ticketType = ticket.getTicketType();
        ticketType.increaseAvailableQuantity(1);
        ticketTypeRepository.save(ticketType);

        // Cập nhật tổng số vé sự kiện
        updateEventTotalTickets(ticket.getEvent().getId());

        log.info("✅ Đã hủy vé {} với lý do: {}", ticket.getTicketCode(), reason);
        return convertToResponse(ticket);
    }

    // ==================== STATISTICS ====================

    /**
     * Thống kê vé của sự kiện
     */
    public TicketStatistics getEventTicketStatistics(Long eventId) {
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

    // ==================== HELPER METHODS ====================

    /**
     * Chuyển đổi Ticket entity sang TicketResponse
     */
    private TicketResponse convertToResponse(Ticket ticket) {
        String qrCodeBase64 = qrCodeService.generateQRCodeBase64(ticket.getQrData());
        return TicketResponse.fromEntity(ticket, qrCodeBase64);
    }

    /**
     * Cập nhật tổng số vé của sự kiện
     */
    private void updateEventTotalTickets(Long eventId) {
        Event event = eventRepository.findById(eventId).orElse(null);
        if (event != null) {
            Integer totalAvailable = ticketTypeRepository.sumAvailableQuantityByEventId(eventId);
            Integer total = ticketTypeRepository.sumTotalQuantityByEventId(eventId);
            event.setAvailableTickets(totalAvailable);
            event.setTotalTickets(total);
            eventRepository.save(event);
        }
    }

    /**
     * Inner class cho thống kê vé
     */
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class TicketStatistics {
        private Long eventId;
        private Integer totalTickets;
        private Integer soldTickets;
        private Integer availableTickets;
        private Integer activeTickets;
        private Integer checkedInTickets;
    }
}

