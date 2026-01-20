package com.ticket.controller;

import com.ticket.dto.FileUploadResponse;
import com.ticket.dto.MessageResponse;
import com.ticket.service.CloudinaryService;
import com.ticket.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Controller xử lý upload file ảnh
 */
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@Slf4j
public class FileUploadController {

    private final CloudinaryService cloudinaryService;
    private final FileStorageService fileStorageService;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    @Value("${storage.type:cloudinary}")
    private String storageType;

    /**
     * API Upload một file ảnh
     * POST /api/files/upload
     * Yêu cầu đăng nhập với role ORGANIZER hoặc ADMIN
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "type", defaultValue = "event") String imageType) {
        try {
            log.info("Bắt đầu upload file: {} (type: {}, storage: {})", 
                    file.getOriginalFilename(), imageType, storageType);

            String fileUrl;
            String fileName;

            if ("cloudinary".equalsIgnoreCase(storageType)) {
                // Upload lên Cloudinary
                fileUrl = uploadToCloudinary(file, imageType);
                fileName = cloudinaryService.extractPublicIdFromUrl(fileUrl);
            } else {
                // Fallback: Lưu local
                fileName = fileStorageService.storeFile(file);
                fileUrl = baseUrl + "/images/" + fileName;
            }

            log.info("Upload thành công: {} -> {}", file.getOriginalFilename(), fileUrl);

            // Tạo response với các URL đã transform
            FileUploadResponse response = FileUploadResponse.builder()
                    .fileName(fileName != null ? fileName : "")
                    .url(fileUrl)
                    .thumbnailUrl(cloudinaryService.getThumbnailUrl(fileUrl))
                    .bannerUrl(cloudinaryService.getBannerUrl(fileUrl))
                    .contentType(file.getContentType())
                    .size(file.getSize())
                    .storageType(storageType)
                    .message("Upload file thành công!")
                    .build();

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            log.error("Lỗi validation: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(new MessageResponse(e.getMessage()));
        } catch (IOException e) {
            log.error("Lỗi upload file: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Lỗi upload file: " + e.getMessage()));
        }
    }

    /**
     * API Upload nhiều file ảnh cùng lúc
     * POST /api/files/upload-multiple
     */
    @PostMapping(value = "/upload-multiple", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> uploadMultipleFiles(
            @RequestParam("files") MultipartFile[] files,
            @RequestParam(value = "type", defaultValue = "gallery") String imageType) {
        try {
            if (files.length == 0) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Không có file nào được chọn"));
            }

            if (files.length > 10) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Chỉ được upload tối đa 10 file cùng lúc"));
            }

            List<FileUploadResponse> responses = new ArrayList<>();

            for (MultipartFile file : files) {
                String fileUrl;
                String fileName;

                if ("cloudinary".equalsIgnoreCase(storageType)) {
                    fileUrl = uploadToCloudinary(file, imageType);
                    fileName = cloudinaryService.extractPublicIdFromUrl(fileUrl);
                } else {
                    fileName = fileStorageService.storeFile(file);
                    fileUrl = baseUrl + "/images/" + fileName;
                }

                responses.add(FileUploadResponse.builder()
                        .fileName(fileName != null ? fileName : "")
                        .url(fileUrl)
                        .thumbnailUrl(cloudinaryService.getThumbnailUrl(fileUrl))
                        .bannerUrl(cloudinaryService.getBannerUrl(fileUrl))
                        .contentType(file.getContentType())
                        .size(file.getSize())
                        .storageType(storageType)
                        .message("Upload thành công")
                        .build());
            }

            log.info("Upload thành công {} files", responses.size());
            return ResponseEntity.ok(responses);

        } catch (IllegalArgumentException e) {
            log.error("Lỗi validation: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(new MessageResponse(e.getMessage()));
        } catch (IOException e) {
            log.error("Lỗi upload nhiều file: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Lỗi upload file: " + e.getMessage()));
        }
    }

    /**
     * API Xóa file ảnh
     * DELETE /api/files/{fileName}
     * 
     * Với Cloudinary: fileName là public_id (vd: ticket_events/abc123)
     * Với Local: fileName là tên file (vd: uuid_image.jpg)
     */
    @DeleteMapping("/{fileName}")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> deleteFile(@PathVariable String fileName) {
        try {
            log.info("Xóa file: {} (storage: {})", fileName, storageType);

            boolean deleted;

            if ("cloudinary".equalsIgnoreCase(storageType)) {
                deleted = cloudinaryService.deleteImage(fileName);
            } else {
                if (!fileStorageService.fileExists(fileName)) {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(new MessageResponse("File không tồn tại: " + fileName));
                }
                deleted = fileStorageService.deleteFile(fileName);
            }

            if (deleted) {
                log.info("Xóa file thành công: {}", fileName);
                return ResponseEntity.ok(new MessageResponse("Xóa file thành công"));
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new MessageResponse("Không thể xóa file"));
            }

        } catch (RuntimeException e) {
            log.error("Lỗi xóa file: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Lỗi xóa file: " + e.getMessage()));
        }
    }

    /**
     * API xóa file theo URL (tiện hơn cho frontend)
     * DELETE /api/files/by-url?url=https://res.cloudinary.com/...
     */
    @DeleteMapping("/by-url")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> deleteFileByUrl(@RequestParam("url") String url) {
        try {
            log.info("Xóa file theo URL: {}", url);

            if ("cloudinary".equalsIgnoreCase(storageType)) {
                String publicId = cloudinaryService.extractPublicIdFromUrl(url);
                if (publicId == null) {
                    return ResponseEntity.badRequest()
                            .body(new MessageResponse("Không thể lấy public_id từ URL"));
                }
                
                boolean deleted = cloudinaryService.deleteImage(publicId);
                if (deleted) {
                    return ResponseEntity.ok(new MessageResponse("Xóa file thành công"));
                } else {
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body(new MessageResponse("Không thể xóa file"));
                }
            } else {
                // Local storage: lấy tên file từ URL
                String fileName = url.substring(url.lastIndexOf("/") + 1);
                return deleteFile(fileName);
            }

        } catch (Exception e) {
            log.error("Lỗi xóa file theo URL: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Lỗi xóa file: " + e.getMessage()));
        }
    }

    /**
     * Helper method: Upload file lên Cloudinary theo loại
     */
    private String uploadToCloudinary(MultipartFile file, String imageType) throws IOException {
        return switch (imageType.toLowerCase()) {
            case "banner" -> cloudinaryService.uploadBannerImage(file);
            case "thumbnail" -> cloudinaryService.uploadThumbnailImage(file);
            case "profile" -> cloudinaryService.uploadProfileImage(file);
            default -> cloudinaryService.uploadEventImage(file);
        };
    }
}
