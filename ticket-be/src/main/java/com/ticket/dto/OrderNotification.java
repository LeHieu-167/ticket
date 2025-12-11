package com.ticket.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderNotification implements Serializable {
    private Long orderId;
    private Long customerId;
    private Long eventId;
    private String orderStatus; // CONFIRMED, FAILED
    private String message;
    private BigDecimal totalPrice;
    private Integer ticketQuantity;
}

