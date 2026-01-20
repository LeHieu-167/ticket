package com.ticket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrganizerStatsResponse {
    private Long ticketsSold;
    private BigDecimal totalRevenue;
    private Long totalCustomers;
    private Long activeEvents;
}

