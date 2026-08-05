package com.ticket.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventRequest {
    
    @NotBlank(message = "Tên sự kiện không được để trống")
    @Size(min = 3, max = 200, message = "Tên sự kiện phải từ 3-200 ký tự")
    private String name;

    @Size(max = 2000, message = "Mô tả không được vượt quá 2000 ký tự")
    private String description;

    @NotBlank(message = "Địa điểm không được để trống")
    private String location;

    /**
     * Địa chỉ chi tiết của sự kiện
     */
    @Size(max = 500, message = "Địa chỉ không được vượt quá 500 ký tự")
    private String address;

    @NotNull(message = "Ngày tổ chức không được để trống")
    @FutureOrPresent(message = "Ngày tổ chức phải là ngày hiện tại hoặc trong tương lai")
    private LocalDateTime eventDate;

    /**
     * Thời gian kết thúc sự kiện (tùy chọn)
     */
    private LocalDateTime eventEndDate;

    @NotNull(message = "Giá vé không được để trống")
    @DecimalMin(value = "0.0", inclusive = true, message = "Giá vé phải lớn hơn hoặc bằng 0")
    private BigDecimal ticketPrice;

    @NotNull(message = "Số lượng vé không được để trống")
    @Min(value = 1, message = "Số lượng vé phải ít nhất là 1")
    private Integer availableTickets;

    /**
     * Tên đơn vị tổ chức
     */
    @Size(max = 200, message = "Tên đơn vị tổ chức không được vượt quá 200 ký tự")
    private String organizerName;

    /**
     * URL hình ảnh banner sự kiện (từ API upload)
     */
    @Size(max = 500, message = "URL banner không được vượt quá 500 ký tự")
    private String bannerImageUrl;

    /**
     * URL hình ảnh thumbnail (từ API upload)
     */
    @Size(max = 500, message = "URL thumbnail không được vượt quá 500 ký tự")
    private String thumbnailUrl;

    /**
     * URL hình ảnh sơ đồ/map địa điểm (từ API upload)
     */
    @Size(max = 500, message = "URL map không được vượt quá 500 ký tự")
    private String mapImageUrl;

    /**
     * Điều khoản và điều kiện
     */
    @Size(max = 5000, message = "Điều khoản không được vượt quá 5000 ký tự")
    private String termsAndConditions;

    /**
     * Danh sách các loại vé của sự kiện (tùy chọn)
     * Nếu không có, sẽ tạo event với giá vé mặc định từ ticketPrice
     */
    @Valid
    private List<TicketTypeRequest> ticketTypes;
}

