package com.ticket.repository;

import com.ticket.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.UUID;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, UUID> {
public interface TicketRepository extends JpaRepository<Ticket, UUID> {

    /**
     * Tìm vé theo mã vé (ticket code) - exact match
     */
    Optional<Ticket> findByTicketCode(String ticketCode);

    /**
     * Tìm vé theo mã vé (ticket code) - case insensitive
     */
    @Query("SELECT t FROM Ticket t WHERE LOWER(t.ticketCode) = LOWER(:ticketCode)")
    Optional<Ticket> findByTicketCodeIgnoreCase(@Param("ticketCode") String ticketCode);

    /**
     * Tìm tất cả vé của một đơn hàng
     */
    List<Ticket> findByOrderId(UUID orderId);

    /**
     * Tìm tất cả vé của một sự kiện
     */
    List<Ticket> findByEventId(UUID eventId);

    /**
     * Tìm tất cả vé của một sự kiện, sắp xếp theo ngày tạo mới nhất
     */
    List<Ticket> findByEventIdOrderByCreatedAtDesc(UUID eventId);

    @Query("SELECT t FROM Ticket t JOIN t.order o WHERE o.customerId = :customerId")
    List<Ticket> findByCustomerId(@Param("customerId") UUID customerId);
    List<Ticket> findByCustomerId(@Param("customerId") UUID customerId);

    @Query("SELECT t FROM Ticket t JOIN t.order o WHERE o.customerId = :customerId AND t.event.id = :eventId")
    List<Ticket> findByCustomerIdAndEventId(@Param("customerId") UUID customerId, @Param("eventId") UUID eventId);
    List<Ticket> findByCustomerIdAndEventId(@Param("customerId") UUID customerId, @Param("eventId") UUID eventId);

    List<Ticket> findByStatus(Ticket.TicketStatus status);

    /**
     * Tìm vé theo sự kiện và trạng thái
     */
    List<Ticket> findByEventIdAndStatus(UUID eventId, Ticket.TicketStatus status);

    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.event.id = :eventId AND t.status = 'USED'")
    Long countCheckedInByEventId(@Param("eventId") UUID eventId);
    Long countCheckedInByEventId(@Param("eventId") UUID eventId);

    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.event.id = :eventId AND t.status = 'ACTIVE'")
    Long countActiveByEventId(@Param("eventId") UUID eventId);
    Long countActiveByEventId(@Param("eventId") UUID eventId);

    List<Ticket> findByTicketTypeId(Long ticketTypeId);

    boolean existsByTicketCode(String ticketCode);

    @Query("SELECT t FROM Ticket t WHERE t.event.id = :eventId AND t.zoneName = :zoneName AND t.rowName = :rowName AND t.seatNumber = :seatNumber AND t.status NOT IN ('CANCELLED', 'REFUNDED')")
    Optional<Ticket> findBySeatInEvent(@Param("eventId") UUID eventId, @Param("zoneName") String zoneName, @Param("rowName") String rowName, @Param("seatNumber") String seatNumber);
    Optional<Ticket> findBySeatInEvent(@Param("eventId") UUID eventId, @Param("zoneName") String zoneName, @Param("rowName") String rowName, @Param("seatNumber") String seatNumber);

    @Query("SELECT t FROM Ticket t WHERE t.event.id = :eventId AND t.zoneName = :zoneName AND t.status NOT IN ('CANCELLED', 'REFUNDED')")
    List<Ticket> findSoldSeatsInZone(@Param("eventId") UUID eventId, @Param("zoneName") String zoneName);
    List<Ticket> findSoldSeatsInZone(@Param("eventId") UUID eventId, @Param("zoneName") String zoneName);

    @Query("SELECT t FROM Ticket t WHERE t.event.id = :eventId AND t.zoneName = :zoneName AND t.rowName = :rowName AND t.status NOT IN ('CANCELLED', 'REFUNDED')")
    List<Ticket> findByZoneAndRow(@Param("eventId") UUID eventId, @Param("zoneName") String zoneName, @Param("rowName") String rowName);
    List<Ticket> findByZoneAndRow(@Param("eventId") UUID eventId, @Param("zoneName") String zoneName, @Param("rowName") String rowName);

    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.ticketType.id = :ticketTypeId AND t.status NOT IN ('CANCELLED', 'REFUNDED')")
    Long countSoldByTicketTypeId(@Param("ticketTypeId") Long ticketTypeId);

    /**
     * Cập nhật hàng loạt vé ACTIVE sang EXPIRED cho sự kiện
     * @return số vé đã cập nhật
     */
    @Modifying
    @Query("UPDATE Ticket t SET t.status = com.ticket.entity.Ticket.TicketStatus.EXPIRED, t.updatedAt = CURRENT_TIMESTAMP WHERE t.event.id = :eventId AND t.status = com.ticket.entity.Ticket.TicketStatus.ACTIVE")
    int updateActiveToExpiredByEventId(@Param("eventId") UUID eventId);
}
