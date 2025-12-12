package com.ticket.repository;

import com.ticket.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, UUID> {

    Optional<Ticket> findByTicketCode(String ticketCode);

    List<Ticket> findByOrderId(UUID orderId);

    List<Ticket> findByEventId(UUID eventId);

    @Query("SELECT t FROM Ticket t JOIN t.order o WHERE o.customerId = :customerId")
    List<Ticket> findByCustomerId(@Param("customerId") UUID customerId);

    @Query("SELECT t FROM Ticket t JOIN t.order o WHERE o.customerId = :customerId AND t.event.id = :eventId")
    List<Ticket> findByCustomerIdAndEventId(@Param("customerId") UUID customerId, @Param("eventId") UUID eventId);

    List<Ticket> findByStatus(Ticket.TicketStatus status);

    List<Ticket> findByEventIdAndStatus(UUID eventId, Ticket.TicketStatus status);

    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.event.id = :eventId AND t.status = 'USED'")
    Long countCheckedInByEventId(@Param("eventId") UUID eventId);

    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.event.id = :eventId AND t.status = 'ACTIVE'")
    Long countActiveByEventId(@Param("eventId") UUID eventId);

    List<Ticket> findByTicketTypeId(Long ticketTypeId);

    boolean existsByTicketCode(String ticketCode);

    @Query("SELECT t FROM Ticket t WHERE t.event.id = :eventId AND t.zoneName = :zoneName AND t.rowName = :rowName AND t.seatNumber = :seatNumber AND t.status NOT IN ('CANCELLED', 'REFUNDED')")
    Optional<Ticket> findBySeatInEvent(@Param("eventId") UUID eventId, @Param("zoneName") String zoneName, @Param("rowName") String rowName, @Param("seatNumber") String seatNumber);

    @Query("SELECT t FROM Ticket t WHERE t.event.id = :eventId AND t.zoneName = :zoneName AND t.status NOT IN ('CANCELLED', 'REFUNDED')")
    List<Ticket> findSoldSeatsInZone(@Param("eventId") UUID eventId, @Param("zoneName") String zoneName);

    @Query("SELECT t FROM Ticket t WHERE t.event.id = :eventId AND t.zoneName = :zoneName AND t.rowName = :rowName AND t.status NOT IN ('CANCELLED', 'REFUNDED')")
    List<Ticket> findByZoneAndRow(@Param("eventId") UUID eventId, @Param("zoneName") String zoneName, @Param("rowName") String rowName);

    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.ticketType.id = :ticketTypeId AND t.status NOT IN ('CANCELLED', 'REFUNDED')")
    Long countSoldByTicketTypeId(@Param("ticketTypeId") Long ticketTypeId);
}
