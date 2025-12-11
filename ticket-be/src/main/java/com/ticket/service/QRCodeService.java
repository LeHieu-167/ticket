package com.ticket.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * Service để tạo mã QR Code cho vé điện tử
 */
@Service
@Slf4j
public class QRCodeService {

    private static final int DEFAULT_WIDTH = 250;
    private static final int DEFAULT_HEIGHT = 250;
    private static final String DEFAULT_FORMAT = "PNG";

    /**
     * Tạo QR Code dạng byte array
     *
     * @param content Nội dung cần encode vào QR
     * @param width   Chiều rộng QR
     * @param height  Chiều cao QR
     * @return byte array của hình ảnh QR
     */
    public byte[] generateQRCodeImage(String content, int width, int height) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.H);
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            hints.put(EncodeHintType.MARGIN, 1);

            BitMatrix bitMatrix = qrCodeWriter.encode(content, BarcodeFormat.QR_CODE, width, height, hints);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, DEFAULT_FORMAT, outputStream);

            log.debug("✅ Đã tạo QR Code cho nội dung: {}", content.substring(0, Math.min(50, content.length())));
            return outputStream.toByteArray();
        } catch (WriterException | IOException e) {
            log.error("❌ Lỗi tạo QR Code: {}", e.getMessage());
            throw new RuntimeException("Không thể tạo QR Code", e);
        }
    }

    /**
     * Tạo QR Code với kích thước mặc định
     */
    public byte[] generateQRCodeImage(String content) {
        return generateQRCodeImage(content, DEFAULT_WIDTH, DEFAULT_HEIGHT);
    }

    /**
     * Tạo QR Code và trả về Base64 string
     * Dùng để nhúng trực tiếp vào HTML/JSON
     *
     * @param content Nội dung cần encode
     * @return Base64 encoded string của hình ảnh QR
     */
    public String generateQRCodeBase64(String content) {
        byte[] qrImage = generateQRCodeImage(content);
        return Base64.getEncoder().encodeToString(qrImage);
    }

    /**
     * Tạo QR Code Base64 với kích thước tùy chỉnh
     */
    public String generateQRCodeBase64(String content, int width, int height) {
        byte[] qrImage = generateQRCodeImage(content, width, height);
        return Base64.getEncoder().encodeToString(qrImage);
    }

    /**
     * Tạo Data URI cho QR Code (dùng trực tiếp trong src của img tag)
     * Format: data:image/png;base64,{base64_data}
     */
    public String generateQRCodeDataUri(String content) {
        String base64 = generateQRCodeBase64(content);
        return "data:image/png;base64," + base64;
    }

    /**
     * Tạo Data URI với kích thước tùy chỉnh
     */
    public String generateQRCodeDataUri(String content, int width, int height) {
        String base64 = generateQRCodeBase64(content, width, height);
        return "data:image/png;base64," + base64;
    }

    /**
     * Tạo nội dung QR cho vé
     * Format: TICKET:{ticketCode}|EVENT:{eventId}|ORDER:{orderId}
     *
     * @param ticketCode Mã vé
     * @param eventId    ID sự kiện
     * @param orderId    ID đơn hàng
     * @return Chuỗi nội dung QR
     */
    public String buildTicketQRContent(String ticketCode, Long eventId, Long orderId) {
        return String.format("TICKET:%s|EVENT:%d|ORDER:%d", ticketCode, eventId, orderId);
    }

    /**
     * Tạo nội dung QR dạng URL để verify online
     *
     * @param baseUrl    URL gốc của hệ thống
     * @param ticketCode Mã vé
     * @return URL để verify vé
     */
    public String buildTicketVerifyUrl(String baseUrl, String ticketCode) {
        return String.format("%s/api/tickets/verify/%s", baseUrl, ticketCode);
    }
}

