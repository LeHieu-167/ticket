package com.ticket.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRequest {
    private Long orderId;
    private String bankCode; // VNPAYQR, VNBANK, INTCARD, etc.
    private String language; // vn, en
}

