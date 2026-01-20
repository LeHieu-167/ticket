package com.ticket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response trả về sau khi upload file thành công
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileUploadResponse {
    
    /**
     * Tên file / public_id (để sử dụng khi cần xóa)
     */
    private String fileName;
    
    /**
     * URL gốc của ảnh (full resolution)
     */
    private String url;
    
    /**
     * URL đã resize 400px width (dùng cho thumbnail, danh sách)
     * Với Cloudinary: tự động thêm transformation w_400,c_scale,q_auto,f_auto
     */
    private String thumbnailUrl;
    
    /**
     * URL đã resize 1200px width (dùng cho banner)
     * Với Cloudinary: tự động thêm transformation w_1200,c_scale,q_auto,f_auto
     */
    private String bannerUrl;
    
    /**
     * Content type của file (image/jpeg, image/png, etc.)
     */
    private String contentType;
    
    /**
     * Kích thước file gốc (bytes)
     */
    private long size;
    
    /**
     * Loại storage đang sử dụng (cloudinary / local)
     */
    private String storageType;
    
    /**
     * Thông báo
     */
    private String message;
}
