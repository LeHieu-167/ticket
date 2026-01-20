package com.ticket.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service xử lý upload ảnh lên Cloudinary
 * 
 * Ưu điểm của Cloudinary:
 * 1. Ảnh được lưu trên cloud, không tốn dung lượng server
 * 2. Tự động tối ưu và resize ảnh
 * 3. CDN toàn cầu, load nhanh
 * 4. Hỗ trợ transformation URL (thêm w_400 để resize)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryService {

    private final Cloudinary cloudinary;

    // Danh sách định dạng ảnh được chấp nhận
    private static final List<String> ALLOWED_CONTENT_TYPES = Arrays.asList(
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp"
    );

    // Kích thước tối đa (5MB)
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;

    /**
     * Upload một ảnh lên Cloudinary
     * 
     * @param file MultipartFile từ request
     * @param folder Thư mục trên Cloudinary (vd: "ticket_events", "ticket_banners")
     * @return URL của ảnh đã upload
     */
    public String uploadImage(MultipartFile file, String folder) throws IOException {
        // Validate file
        validateFile(file);

        // Tạo tên file unique
        String fileName = UUID.randomUUID().toString();

        log.info("Uploading image to Cloudinary: {} -> folder: {}", file.getOriginalFilename(), folder);

        // Upload lên Cloudinary
        @SuppressWarnings("unchecked")
        Map<String, Object> uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                "public_id", fileName,
                "folder", folder,
                "resource_type", "auto",
                "overwrite", true,
                "invalidate", true
        ));

        String secureUrl = uploadResult.get("secure_url").toString();
        log.info("Upload successful: {}", secureUrl);

        return secureUrl;
    }

    /**
     * Upload ảnh event (banner/thumbnail)
     */
    public String uploadEventImage(MultipartFile file) throws IOException {
        return uploadImage(file, "ticket_events");
    }

    /**
     * Upload ảnh banner
     */
    public String uploadBannerImage(MultipartFile file) throws IOException {
        return uploadImage(file, "ticket_banners");
    }

    /**
     * Upload ảnh thumbnail
     */
    public String uploadThumbnailImage(MultipartFile file) throws IOException {
        return uploadImage(file, "ticket_thumbnails");
    }

    /**
     * Upload ảnh profile user
     */
    public String uploadProfileImage(MultipartFile file) throws IOException {
        return uploadImage(file, "ticket_profiles");
    }

    /**
     * Xóa ảnh trên Cloudinary theo public_id
     * 
     * @param publicId Public ID của ảnh (có thể lấy từ URL)
     * @return true nếu xóa thành công
     */
    public boolean deleteImage(String publicId) {
        try {
            log.info("Deleting image from Cloudinary: {}", publicId);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> result = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            
            String resultStatus = result.get("result").toString();
            boolean success = "ok".equals(resultStatus);
            
            if (success) {
                log.info("Delete successful: {}", publicId);
            } else {
                log.warn("Delete failed: {} - Result: {}", publicId, resultStatus);
            }
            
            return success;
        } catch (IOException e) {
            log.error("Error deleting image: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Lấy public_id từ URL Cloudinary
     * URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v1234567890/{folder}/{public_id}.{format}
     * 
     * @param url URL của ảnh
     * @return public_id (bao gồm folder)
     */
    public String extractPublicIdFromUrl(String url) {
        if (url == null || url.isEmpty()) {
            return null;
        }

        try {
            // URL format: .../upload/v123456789/folder/filename.jpg
            // Cần lấy phần folder/filename (không có extension)
            String[] parts = url.split("/upload/");
            if (parts.length < 2) {
                return null;
            }

            String pathPart = parts[1];
            // Bỏ version (v123456789/)
            if (pathPart.startsWith("v")) {
                int slashIndex = pathPart.indexOf("/");
                if (slashIndex > 0) {
                    pathPart = pathPart.substring(slashIndex + 1);
                }
            }

            // Bỏ extension
            int dotIndex = pathPart.lastIndexOf(".");
            if (dotIndex > 0) {
                pathPart = pathPart.substring(0, dotIndex);
            }

            return pathPart;
        } catch (Exception e) {
            log.error("Error extracting public_id from URL: {}", url, e);
            return null;
        }
    }

    /**
     * Tạo URL với transformation để resize ảnh
     * 
     * Ví dụ:
     * - Original: https://res.cloudinary.com/xxx/image/upload/v123/folder/abc.jpg
     * - Resized:  https://res.cloudinary.com/xxx/image/upload/w_400,c_scale/v123/folder/abc.jpg
     * 
     * @param originalUrl URL gốc
     * @param width Chiều rộng mong muốn
     * @return URL đã thêm transformation
     */
    public String getResizedUrl(String originalUrl, int width) {
        if (originalUrl == null || !originalUrl.contains("/upload/")) {
            return originalUrl;
        }

        // Chèn transformation vào sau /upload/
        String transformation = "w_" + width + ",c_scale,q_auto,f_auto";
        return originalUrl.replace("/upload/", "/upload/" + transformation + "/");
    }

    /**
     * Tạo URL thumbnail (400px width)
     */
    public String getThumbnailUrl(String originalUrl) {
        return getResizedUrl(originalUrl, 400);
    }

    /**
     * Tạo URL banner (1200px width)
     */
    public String getBannerUrl(String originalUrl) {
        return getResizedUrl(originalUrl, 1200);
    }

    /**
     * Validate file trước khi upload
     */
    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File không được để trống");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Kích thước file không được vượt quá 5MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Định dạng file không được hỗ trợ. Chỉ chấp nhận: JPG, PNG, GIF, WEBP");
        }
    }
}

