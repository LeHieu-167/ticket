package com.ticket.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentResponse {
    private String code; // 00 = success
    private String message;
    private String paymentUrl; // URL để redirect tới VNPay
}

