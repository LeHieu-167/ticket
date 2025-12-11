package com.ticket.repository;

import com.ticket.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    // Lấy danh sách đơn hàng của một customer cụ thể
    List<Order> findByCustomerId(Long customerId);
    
    // Lấy danh sách đơn hàng theo event
    List<Order> findByEventId(Long eventId);
    
    // Lấy danh sách đơn hàng của customer với status cụ thể
    List<Order> findByCustomerIdAndStatus(Long customerId, Order.OrderStatus status);
}

