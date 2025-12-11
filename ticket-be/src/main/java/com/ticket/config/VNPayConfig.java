package com.ticket.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
@Getter
public class VNPayConfig {
    
    @Value("${vnpay.pay-url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}")
    private String vnpPayUrl;
    
    @Value("${vnpay.return-url}")
    private String vnpReturnUrl;
    
    @Value("${vnpay.tmn-code}")
    private String vnpTmnCode;
    
    @Value("${vnpay.secret-key}")
    private String vnpSecretKey;
    
    @Value("${vnpay.api-url:https://sandbox.vnpayment.vn/merchant_webapi/api/transaction}")
    private String vnpApiUrl;
    
    @Value("${vnpay.version:2.1.0}")
    private String vnpVersion;
    
    @Value("${vnpay.command:pay}")
    private String vnpCommand;
    
    @Value("${vnpay.order-type:other}")
    private String vnpOrderType;
}

