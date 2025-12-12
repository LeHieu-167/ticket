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
import java.util.UUID;

@Service
@Slf4j
public class QRCodeService {

    private static final int DEFAULT_WIDTH = 250;
    private static final int DEFAULT_HEIGHT = 250;
    private static final String DEFAULT_FORMAT = "PNG";

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

            return outputStream.toByteArray();
        } catch (WriterException | IOException e) {
            log.error("Lỗi tạo QR Code: {}", e.getMessage());
            throw new RuntimeException("Không thể tạo QR Code", e);
        }
    }

    public byte[] generateQRCodeImage(String content) {
        return generateQRCodeImage(content, DEFAULT_WIDTH, DEFAULT_HEIGHT);
    }

    public String generateQRCodeBase64(String content) {
        byte[] qrImage = generateQRCodeImage(content);
        return Base64.getEncoder().encodeToString(qrImage);
    }

    public String generateQRCodeBase64(String content, int width, int height) {
        byte[] qrImage = generateQRCodeImage(content, width, height);
        return Base64.getEncoder().encodeToString(qrImage);
    }

    public String generateQRCodeDataUri(String content) {
        String base64 = generateQRCodeBase64(content);
        return "data:image/png;base64," + base64;
    }

    public String buildTicketQRContent(String ticketCode, UUID eventId, UUID orderId) {
        return String.format("TICKET:%s|EVENT:%s|ORDER:%s", ticketCode, eventId.toString(), orderId.toString());
    }

    public String buildTicketVerifyUrl(String baseUrl, String ticketCode) {
        return String.format("%s/api/tickets/verify/%s", baseUrl, ticketCode);
    }
}
