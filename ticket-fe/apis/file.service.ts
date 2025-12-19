import api from "@/config/axios.config";

/**
 * Loại ảnh upload
 */
export type ImageType = "event" | "banner" | "thumbnail" | "profile" | "gallery";

/**
 * Response từ API upload file (Cloudinary)
 */
export interface FileUploadResponse {
  /** Tên file / public_id (để xóa) */
  fileName: string;
  /** URL gốc (full resolution) */
  url: string;
  /** URL đã resize 400px (dùng cho danh sách, card) */
  thumbnailUrl: string;
  /** URL đã resize 1200px (dùng cho banner) */
  bannerUrl: string;
  /** Content type (image/jpeg, etc.) */
  contentType: string;
  /** Kích thước file (bytes) */
  size: number;
  /** Loại storage (cloudinary/local) */
  storageType: string;
  /** Thông báo */
  message: string;
}

/**
 * Service xử lý upload file
 */
export const fileService = {
  /**
   * Upload một file ảnh
   * @param file - File cần upload
   * @param type - Loại ảnh (event, banner, thumbnail, profile, gallery)
   * @param onProgress - Callback theo dõi tiến trình upload (0-100)
   * @returns Promise<FileUploadResponse>
   */
  async uploadFile(
    file: File,
    type: ImageType = "event",
    onProgress?: (percent: number) => void
  ): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post<FileUploadResponse>(
      `/api/files/upload?type=${type}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percent);
          }
        },
      }
    );

    return response.data;
  },

  /**
   * Upload nhiều file ảnh cùng lúc
   * @param files - Mảng các file cần upload
   * @param type - Loại ảnh
   * @param onProgress - Callback theo dõi tiến trình upload
   * @returns Promise<FileUploadResponse[]>
   */
  async uploadMultipleFiles(
    files: File[],
    type: ImageType = "gallery",
    onProgress?: (percent: number) => void
  ): Promise<FileUploadResponse[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await api.post<FileUploadResponse[]>(
      `/api/files/upload-multiple?type=${type}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percent);
          }
        },
      }
    );

    return response.data;
  },

  /**
   * Xóa file đã upload (theo fileName/public_id)
   * @param fileName - Tên file / public_id cần xóa
   */
  async deleteFile(fileName: string): Promise<void> {
    await api.delete(`/api/files/${encodeURIComponent(fileName)}`);
  },

  /**
   * Xóa file đã upload (theo URL) - tiện hơn cho frontend
   * @param url - URL của file cần xóa
   */
  async deleteFileByUrl(url: string): Promise<void> {
    await api.delete(`/api/files/by-url?url=${encodeURIComponent(url)}`);
  },

  /**
   * Validate file trước khi upload
   * @param file - File cần validate
   * @param maxSizeMB - Kích thước tối đa (MB), mặc định 5MB
   * @returns Object với isValid và error message
   */
  validateFile(
    file: File,
    maxSizeMB: number = 5
  ): { isValid: boolean; error?: string } {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: "Chỉ chấp nhận file ảnh định dạng: JPG, PNG, GIF, WEBP",
      };
    }

    if (file.size > maxSizeBytes) {
      return {
        isValid: false,
        error: `Kích thước file không được vượt quá ${maxSizeMB}MB`,
      };
    }

    return { isValid: true };
  },

  /**
   * Tạo URL resize từ URL gốc Cloudinary
   * Có thể dùng ở Frontend để tự resize theo nhu cầu
   *
   * @example
   * const smallUrl = fileService.getResizedUrl(originalUrl, 200);
   * // https://res.cloudinary.com/.../w_200,c_scale,q_auto,f_auto/...
   */
  getResizedUrl(originalUrl: string, width: number): string {
    if (!originalUrl || !originalUrl.includes("/upload/")) {
      return originalUrl;
    }
    const transformation = `w_${width},c_scale,q_auto,f_auto`;
    return originalUrl.replace("/upload/", `/upload/${transformation}/`);
  },

  /**
   * Tạo URL crop vuông (cho avatar, profile)
   *
   * @example
   * const avatarUrl = fileService.getSquareCropUrl(originalUrl, 150);
   */
  getSquareCropUrl(originalUrl: string, size: number): string {
    if (!originalUrl || !originalUrl.includes("/upload/")) {
      return originalUrl;
    }
    const transformation = `w_${size},h_${size},c_fill,g_face,q_auto,f_auto`;
    return originalUrl.replace("/upload/", `/upload/${transformation}/`);
  },

  /**
   * Tạo URL blur (cho placeholder, loading)
   */
  getBlurUrl(originalUrl: string, width: number = 20): string {
    if (!originalUrl || !originalUrl.includes("/upload/")) {
      return originalUrl;
    }
    const transformation = `w_${width},e_blur:1000,q_auto,f_auto`;
    return originalUrl.replace("/upload/", `/upload/${transformation}/`);
  },
};

export default fileService;
