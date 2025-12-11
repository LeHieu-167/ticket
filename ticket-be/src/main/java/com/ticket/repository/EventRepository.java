package com.ticket.repository;

import com.ticket.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {
    // Lấy danh sách sự kiện của một organizer cụ thể
    List<Event> findByOrganizerId(Long organizerId);
    
    // Lấy danh sách sự kiện đang hoạt động (công khai)
    List<Event> findByIsActiveTrue();
    
    // Lấy danh sách sự kiện của organizer và đang hoạt động
    List<Event> findByOrganizerIdAndIsActiveTrue(Long organizerId);
}

