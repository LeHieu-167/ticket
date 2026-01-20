package com.ticket.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

/**
 * Service xử lý lưu trữ file ảnh
 * Lưu ảnh vào thư mục local trên server
 */
@Service
public class FileStorageService {

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    @Value("${file.max-size:5242880}") // 5MB default
    private long maxFileSize;

    private Path fileStorageLocation;

    // Danh sách các định dạng ảnh được chấp nhận
    private static final List<String> ALLOWED_CONTENT_TYPES = Arrays.asList(
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp"
    );

    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
            "jpg", "jpeg", "png", "gif", "webp"
    );

    @PostConstruct
    public void init() {
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Không thể tạo thư mục lưu trữ file: " + uploadDir, ex);
        }
    }

    /**
     * Lưu file ảnh và trả về tên file đã lưu
     * @param file MultipartFile từ request
     * @return Tên file đã lưu (với UUID prefix)
     */
    public String storeFile(MultipartFile file) {
        // Validate file
        validateFile(file);

        // Lấy tên file gốc và làm sạch
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());
        
        // Lấy extension của file
        String fileExtension = getFileExtension(originalFileName);
        
        // Tạo tên file unique với UUID
        String uniqueFileName = UUID.randomUUID().toString() + "." + fileExtension;

        try {
            // Kiểm tra tên file có chứa ký tự không hợp lệ
            if (originalFileName.contains("..")) {
                throw new RuntimeException("Tên file chứa ký tự không hợp lệ: " + originalFileName);
            }

            // Copy file vào thư mục đích
            Path targetLocation = this.fileStorageLocation.resolve(uniqueFileName);
            
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetLocation, StandardCopyOption.REPLACE_EXISTING);
            }

            return uniqueFileName;
        } catch (IOException ex) {
            throw new RuntimeException("Không thể lưu file " + originalFileName + ". Vui lòng thử lại!", ex);
        }
    }

    /**
     * Xóa file theo tên
     * @param fileName Tên file cần xóa
     * @return true nếu xóa thành công
     */
    public boolean deleteFile(String fileName) {
        try {
            Path filePath = this.fileStorageLocation.resolve(fileName).normalize();
            return Files.deleteIfExists(filePath);
        } catch (IOException ex) {
            throw new RuntimeException("Không thể xóa file " + fileName, ex);
        }
    }

    /**
     * Kiểm tra file có tồn tại không
     * @param fileName Tên file
     * @return true nếu file tồn tại
     */
    public boolean fileExists(String fileName) {
        Path filePath = this.fileStorageLocation.resolve(fileName).normalize();
        return Files.exists(filePath);
    }

    /**
     * Lấy đường dẫn đầy đủ của file
     * @param fileName Tên file
     * @return Path của file
     */
    public Path getFilePath(String fileName) {
        return this.fileStorageLocation.resolve(fileName).normalize();
    }

    /**
     * Validate file upload
     */
    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("File không được để trống");
        }

        // Kiểm tra kích thước file
        if (file.getSize() > maxFileSize) {
            throw new RuntimeException("Kích thước file vượt quá giới hạn cho phép (" + (maxFileSize / 1024 / 1024) + "MB)");
        }

        // Kiểm tra content type
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new RuntimeException("Định dạng file không được hỗ trợ. Chỉ chấp nhận: JPG, PNG, GIF, WEBP");
        }

        // Kiểm tra extension
        String originalFileName = file.getOriginalFilename();
        if (originalFileName != null) {
            String extension = getFileExtension(originalFileName).toLowerCase();
            if (!ALLOWED_EXTENSIONS.contains(extension)) {
                throw new RuntimeException("Phần mở rộng file không được hỗ trợ. Chỉ chấp nhận: " + String.join(", ", ALLOWED_EXTENSIONS));
            }
        }
    }

    /**
     * Lấy extension của file
     */
    private String getFileExtension(String fileName) {
        if (fileName == null || fileName.lastIndexOf(".") == -1) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf(".") + 1);
    }

    /**
     * Lấy đường dẫn thư mục upload
     */
    public String getUploadDir() {
        return uploadDir;
    }
}

