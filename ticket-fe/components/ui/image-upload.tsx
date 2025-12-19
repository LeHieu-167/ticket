"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import fileService, {
  FileUploadResponse,
  ImageType,
} from "@/apis/file.service";

interface ImageUploadProps {
  /**
   * Callback khi upload thành công
   * Trả về object chứa tất cả URL (original, thumbnail, banner)
   */
  onUploadSuccess: (response: {
    url: string;
    thumbnailUrl: string;
    bannerUrl: string;
  }) => void;

  /**
   * Callback khi có lỗi xảy ra
   */
  onUploadError?: (error: string) => void;

  /**
   * URL ảnh hiện tại (để preview)
   */
  currentImageUrl?: string;

  /**
   * Label hiển thị
   */
  label?: string;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Cho phép xóa ảnh đã upload
   */
  allowDelete?: boolean;

  /**
   * CSS class tùy chỉnh
   */
  className?: string;

  /**
   * Kích thước tối đa (MB)
   */
  maxSizeMB?: number;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Loại ảnh (để Cloudinary phân loại folder)
   */
  imageType?: ImageType;
}

export function ImageUpload({
  onUploadSuccess,
  onUploadError,
  currentImageUrl,
  label = "Tải ảnh lên",
  placeholder = "Kéo thả ảnh hoặc click để chọn",
  allowDelete = true,
  className = "",
  maxSizeMB = 5,
  disabled = false,
  imageType = "event",
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentImageUrl || null
  );
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedResponse, setUploadedResponse] =
    useState<FileUploadResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (file: File) => {
      // Reset state
      setError(null);
      setUploadProgress(0);

      // Validate file
      const validation = fileService.validateFile(file, maxSizeMB);
      if (!validation.isValid) {
        setError(validation.error || "File không hợp lệ");
        onUploadError?.(validation.error || "File không hợp lệ");
        return;
      }

      // Preview ngay lập tức (local preview)
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Upload lên Cloudinary
      setIsUploading(true);
      try {
        const response: FileUploadResponse = await fileService.uploadFile(
          file,
          imageType,
          (percent) => setUploadProgress(percent)
        );

        // Lưu response
        setUploadedResponse(response);

        // Hiển thị ảnh từ Cloudinary (đã optimize)
        // Sử dụng thumbnailUrl cho preview vì nhẹ hơn
        setPreviewUrl(response.thumbnailUrl || response.url);

        // Callback với đầy đủ thông tin
        onUploadSuccess({
          url: response.url,
          thumbnailUrl: response.thumbnailUrl,
          bannerUrl: response.bannerUrl,
        });

        // Cleanup object URL
        URL.revokeObjectURL(objectUrl);
      } catch (err: any) {
        setError(err.response?.data?.message || "Lỗi upload ảnh");
        onUploadError?.(err.response?.data?.message || "Lỗi upload ảnh");
        setPreviewUrl(currentImageUrl || null);
        URL.revokeObjectURL(objectUrl);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [maxSizeMB, imageType, onUploadSuccess, onUploadError, currentImageUrl]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input để có thể chọn lại cùng file
    e.target.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled) return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [disabled, handleFileSelect]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDelete = async () => {
    // Xóa file trên Cloudinary nếu có
    if (uploadedResponse?.url) {
      try {
        await fileService.deleteFileByUrl(uploadedResponse.url);
      } catch (err) {
        console.warn("Could not delete file from cloud:", err);
      }
    }

    setPreviewUrl(null);
    setError(null);
    setUploadedResponse(null);
    onUploadSuccess({ url: "", thumbnailUrl: "", bannerUrl: "" });
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer
          ${isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-300"}
          ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-gray-400"}
          ${error ? "border-red-300 bg-red-50" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleInputChange}
          disabled={disabled || isUploading}
          className="hidden"
        />

        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-48 object-cover rounded-lg"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                <div className="text-white text-center">
                  <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <span>{uploadProgress}%</span>
                </div>
              </div>
            )}
            {allowDelete && !isUploading && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="absolute top-2 right-2"
              >
                Xóa
              </Button>
            )}
            {/* Badge hiển thị storage type */}
            {uploadedResponse?.storageType && (
              <span className="absolute bottom-2 left-2 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                {uploadedResponse.storageType === "cloudinary" ? "☁️ Cloud" : "💾 Local"}
              </span>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">{placeholder}</p>
            <p className="mt-1 text-xs text-gray-500">
              PNG, JPG, GIF, WEBP tối đa {maxSizeMB}MB
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {isUploading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
}

export default ImageUpload;
