package com.ticket.repository;

import com.ticket.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EventRepository extends JpaRepository<Event, UUID> {
    List<Event> findByOrganizerId(UUID organizerId);
    List<Event> findByIsActiveTrue();
    List<Event> findByOrganizerIdAndIsActiveTrue(UUID organizerId);
    Optional<Event> findBySlug(String slug);
    boolean existsBySlug(String slug);
}
