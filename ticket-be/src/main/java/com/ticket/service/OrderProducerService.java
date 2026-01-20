package com.ticket.service;

import com.ticket.dto.OrderRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderProducerService {

    private final KafkaTemplate<String, OrderRequest> kafkaTemplate;

    @Value("${kafka.topic.order-requests}")
    private String orderRequestsTopic;

    /**
     * Gửi yêu cầu đặt vé vào Kafka topic
     * @param orderRequest Yêu cầu đặt vé từ customer
     * @return CompletableFuture để xử lý kết quả bất đồng bộ
     */
    public CompletableFuture<SendResult<String, OrderRequest>> sendOrderRequest(OrderRequest orderRequest) {
        log.info("Đang gửi yêu cầu đặt vé vào Kafka - Customer: {}, Event: {}, Quantity: {}",
                orderRequest.getCustomerId(), orderRequest.getEventId(), orderRequest.getTicketQuantity());

        // Key = eventId để đảm bảo các order của cùng 1 event vào cùng 1 partition
        String key = "event-" + orderRequest.getEventId();

        CompletableFuture<SendResult<String, OrderRequest>> future = 
            kafkaTemplate.send(orderRequestsTopic, key, orderRequest);

        future.whenComplete((result, ex) -> {
            if (ex == null) {
                log.info("Đã gửi thành công yêu cầu đặt vé vào Kafka - Partition: {}, Offset: {}",
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset());
            } else {
                log.error("Lỗi khi gửi yêu cầu đặt vé vào Kafka: {}", ex.getMessage());
            }
        });

        return future;
    }
}

