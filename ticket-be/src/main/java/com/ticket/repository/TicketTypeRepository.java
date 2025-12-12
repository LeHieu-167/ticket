package com.ticket.repository;

import com.ticket.entity.TicketType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TicketTypeRepository extends JpaRepository<TicketType, Long> {

    List<TicketType> findByEventIdOrderByDisplayOrderAsc(UUID eventId);

    List<TicketType> findByEventIdAndIsActiveTrueOrderByDisplayOrderAsc(UUID eventId);

    Optional<TicketType> findByEventIdAndName(UUID eventId, String name);

    @Query("SELECT tt FROM TicketType tt WHERE tt.event.id = :eventId AND tt.isActive = true AND tt.availableQuantity > 0 ORDER BY tt.displayOrder")
    List<TicketType> findAvailableByEventId(@Param("eventId") UUID eventId);

    @Query("SELECT COALESCE(SUM(tt.availableQuantity), 0) FROM TicketType tt WHERE tt.event.id = :eventId AND tt.isActive = true")
    Integer sumAvailableQuantityByEventId(@Param("eventId") UUID eventId);

    @Query("SELECT COALESCE(SUM(tt.totalQuantity), 0) FROM TicketType tt WHERE tt.event.id = :eventId")
    Integer sumTotalQuantityByEventId(@Param("eventId") UUID eventId);

    boolean existsByIdAndEventId(Long id, UUID eventId);
}
