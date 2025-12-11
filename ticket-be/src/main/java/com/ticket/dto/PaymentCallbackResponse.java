package com.ticket.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentCallbackResponse {
    private String RspCode; // "00" = success
    private String Message;
    
    public static PaymentCallbackResponse success() {
        return new PaymentCallbackResponse("00", "Xác nhận thành công");
    }
    
    public static PaymentCallbackResponse error(String message) {
        return new PaymentCallbackResponse("99", message);
    }
}

