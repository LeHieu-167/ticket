package com.ticket.dto;

import com.ticket.entity.Ticket;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO cho response check-in vé
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckInResponse {

    /**
     * Kết quả check-in (true = thành công, false = thất bại)
     */
    private boolean success;

    /**
     * Thông báo kết quả
     */
    private String message;

    /**
     * Thông tin vé sau khi check-in (dùng TicketResponse đầy đủ để frontend tương thích)
     */
    private TicketResponse ticket;

    /**
     * Thời gian check-in
     */
    private String checkedInAt;

    /**
     * Constructor tiện lợi cho trường hợp thành công
     */
    public static CheckInResponse success(Ticket ticket, String message) {
        return CheckInResponse.builder()
                .success(true)
                .message(message != null ? message : "Check-in thành công!")
                .ticket(TicketResponse.fromEntity(ticket))
                .checkedInAt(ticket.getCheckedInAt() != null 
                        ? ticket.getCheckedInAt().toString() 
                        : LocalDateTime.now().toString())
                .build();
    }

    /**
     * Constructor tiện lợi cho trường hợp thất bại
     */
    public static CheckInResponse failure(String message) {
        return CheckInResponse.builder()
                .success(false)
                .message(message)
                .build();
    }

    /**
     * Constructor tiện lợi cho trường hợp thất bại với thông tin vé
     */
    public static CheckInResponse failure(String message, Ticket ticket) {
        return CheckInResponse.builder()
                .success(false)
                .message(message)
                .ticket(ticket != null ? TicketResponse.fromEntity(ticket) : null)
                .build();
    }
}
