package com.ticket.repository;

import com.ticket.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {

    /**
     * Tìm vé theo mã vé (ticket code)
     */
    Optional<Ticket> findByTicketCode(String ticketCode);

    /**
     * Tìm tất cả vé của một đơn hàng
     */
    List<Ticket> findByOrderId(Long orderId);

    /**
     * Tìm tất cả vé của một sự kiện
     */
    List<Ticket> findByEventId(Long eventId);

    /**
     * Tìm tất cả vé của một khách hàng (thông qua order)
     */
    @Query("SELECT t FROM Ticket t JOIN t.order o WHERE o.customerId = :customerId")
    List<Ticket> findByCustomerId(@Param("customerId") Long customerId);

    /**
     * Tìm tất cả vé của một khách hàng cho một sự kiện cụ thể
     */
    @Query("SELECT t FROM Ticket t JOIN t.order o WHERE o.customerId = :customerId AND t.event.id = :eventId")
    List<Ticket> findByCustomerIdAndEventId(@Param("customerId") Long customerId, @Param("eventId") Long eventId);

    /**
     * Tìm vé theo trạng thái
     */
    List<Ticket> findByStatus(Ticket.TicketStatus status);

    /**
     * Tìm vé theo sự kiện và trạng thái
     */
    List<Ticket> findByEventIdAndStatus(Long eventId, Ticket.TicketStatus status);

    /**
     * Đếm số vé đã check-in của một sự kiện
     */
    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.event.id = :eventId AND t.status = 'USED'")
    Long countCheckedInByEventId(@Param("eventId") Long eventId);

    /**
     * Đếm tổng số vé active của một sự kiện
     */
    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.event.id = :eventId AND t.status = 'ACTIVE'")
    Long countActiveByEventId(@Param("eventId") Long eventId);

    /**
     * Tìm vé theo loại vé
     */
    List<Ticket> findByTicketTypeId(Long ticketTypeId);

    /**
     * Kiểm tra vé đã tồn tại với mã code chưa
     */
    boolean existsByTicketCode(String ticketCode);

    /**
     * Tìm vé theo ghế cụ thể trong sự kiện (dùng cho FULL_SEAT)
     */
    @Query("SELECT t FROM Ticket t WHERE t.event.id = :eventId AND t.zoneName = :zoneName AND t.rowName = :rowName AND t.seatNumber = :seatNumber AND t.status NOT IN ('CANCELLED', 'REFUNDED')")
    Optional<Ticket> findBySeatInEvent(@Param("eventId") Long eventId, @Param("zoneName") String zoneName, @Param("rowName") String rowName, @Param("seatNumber") String seatNumber);

    /**
     * Lấy danh sách ghế đã bán trong một khu vực
     */
    @Query("SELECT t FROM Ticket t WHERE t.event.id = :eventId AND t.zoneName = :zoneName AND t.status NOT IN ('CANCELLED', 'REFUNDED')")
    List<Ticket> findSoldSeatsInZone(@Param("eventId") Long eventId, @Param("zoneName") String zoneName);

    /**
     * Tìm vé theo khu vực và hàng (dùng cho ZONE_WITH_ROW)
     */
    @Query("SELECT t FROM Ticket t WHERE t.event.id = :eventId AND t.zoneName = :zoneName AND t.rowName = :rowName AND t.status NOT IN ('CANCELLED', 'REFUNDED')")
    List<Ticket> findByZoneAndRow(@Param("eventId") Long eventId, @Param("zoneName") String zoneName, @Param("rowName") String rowName);

    /**
     * Đếm số vé đã bán theo loại vé
     */
    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.ticketType.id = :ticketTypeId AND t.status NOT IN ('CANCELLED', 'REFUNDED')")
    Long countSoldByTicketTypeId(@Param("ticketTypeId") Long ticketTypeId);
}

