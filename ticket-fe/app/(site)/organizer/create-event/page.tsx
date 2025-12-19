"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ImageUpload } from "@/components/ui/image-upload";
import eventService, { EventRequest } from "@/apis/event.service";

/**
 * Trang tạo sự kiện cho Organizer
 * Bao gồm tính năng upload ảnh banner và thumbnail
 */
export default function CreateEventPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState<EventRequest>({
    name: "",
    description: "",
    location: "",
    address: "",
    eventDate: "",
    eventEndDate: "",
    ticketPrice: 0,
    availableTickets: 0,
    organizerName: "",
    bannerImageUrl: "",
    thumbnailUrl: "",
    termsAndConditions: "",
  });

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  // Handle banner upload success (nhận đầy đủ URLs từ Cloudinary)
  const handleBannerUpload = (response: {
    url: string;
    thumbnailUrl: string;
    bannerUrl: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      // Lưu URL gốc (hoặc bannerUrl đã resize 1200px)
      bannerImageUrl: response.bannerUrl || response.url,
    }));
  };

  // Handle thumbnail upload success
  const handleThumbnailUpload = (response: {
    url: string;
    thumbnailUrl: string;
    bannerUrl: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      // Lưu thumbnailUrl đã resize 400px
      thumbnailUrl: response.thumbnailUrl || response.url,
    }));
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.name || !formData.location || !formData.eventDate) {
        throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc");
      }

      if (formData.ticketPrice <= 0) {
        throw new Error("Giá vé phải lớn hơn 0");
      }

      if (formData.availableTickets < 1) {
        throw new Error("Số lượng vé phải ít nhất là 1");
      }

      // Gọi API tạo sự kiện
      const response = await eventService.createEvent(formData);

      console.log("Tạo sự kiện thành công:", response);
      setSubmitSuccess(true);

      // Reset form
      setFormData({
        name: "",
        description: "",
        location: "",
        address: "",
        eventDate: "",
        eventEndDate: "",
        ticketPrice: 0,
        availableTickets: 0,
        organizerName: "",
        bannerImageUrl: "",
        thumbnailUrl: "",
        termsAndConditions: "",
      });
    } catch (error: any) {
      console.error("Lỗi tạo sự kiện:", error);
      setSubmitError(
        error.response?.data?.message || error.message || "Có lỗi xảy ra"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8 text-center">Tạo sự kiện mới</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Thông tin cơ bản */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Thông tin cơ bản</h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">
                Tên sự kiện <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Nhập tên sự kiện"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Mô tả sự kiện</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Mô tả chi tiết về sự kiện..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">
                  Địa điểm <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="VD: Hà Nội, TP.HCM..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="address">Địa chỉ chi tiết</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Số nhà, đường, quận/huyện..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="organizerName">Tên đơn vị tổ chức</Label>
              <Input
                id="organizerName"
                name="organizerName"
                value={formData.organizerName}
                onChange={handleInputChange}
                placeholder="Tên công ty/ban tổ chức"
              />
            </div>
          </div>
        </Card>

        {/* Thời gian */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Thời gian</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="eventDate">
                Ngày giờ bắt đầu <span className="text-red-500">*</span>
              </Label>
              <Input
                id="eventDate"
                name="eventDate"
                type="datetime-local"
                value={formData.eventDate}
                onChange={handleInputChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="eventEndDate">Ngày giờ kết thúc</Label>
              <Input
                id="eventEndDate"
                name="eventEndDate"
                type="datetime-local"
                value={formData.eventEndDate}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </Card>

        {/* Vé */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Thông tin vé</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ticketPrice">
                Giá vé (VNĐ) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="ticketPrice"
                name="ticketPrice"
                type="number"
                min="1000"
                step="1000"
                value={formData.ticketPrice || ""}
                onChange={handleInputChange}
                placeholder="100000"
                required
              />
            </div>

            <div>
              <Label htmlFor="availableTickets">
                Số lượng vé <span className="text-red-500">*</span>
              </Label>
              <Input
                id="availableTickets"
                name="availableTickets"
                type="number"
                min="1"
                value={formData.availableTickets || ""}
                onChange={handleInputChange}
                placeholder="100"
                required
              />
            </div>
          </div>
        </Card>

        {/* Hình ảnh */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Hình ảnh sự kiện</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ImageUpload
              label="Ảnh banner (1200x600 khuyến nghị)"
              placeholder="Kéo thả hoặc click để tải ảnh banner"
              currentImageUrl={formData.bannerImageUrl}
              onUploadSuccess={handleBannerUpload}
              onUploadError={(err) => console.error("Banner upload error:", err)}
              maxSizeMB={5}
            />

            <ImageUpload
              label="Ảnh thumbnail (600x400 khuyến nghị)"
              placeholder="Kéo thả hoặc click để tải thumbnail"
              currentImageUrl={formData.thumbnailUrl}
              onUploadSuccess={handleThumbnailUpload}
              onUploadError={(err) =>
                console.error("Thumbnail upload error:", err)
              }
              maxSizeMB={5}
            />
          </div>

          {/* Hiển thị URL đã upload */}
          {(formData.bannerImageUrl || formData.thumbnailUrl) && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
              <p className="font-medium mb-2">URL ảnh đã upload:</p>
              {formData.bannerImageUrl && (
                <p className="text-gray-600 break-all">
                  <strong>Banner:</strong> {formData.bannerImageUrl}
                </p>
              )}
              {formData.thumbnailUrl && (
                <p className="text-gray-600 break-all">
                  <strong>Thumbnail:</strong> {formData.thumbnailUrl}
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Điều khoản */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Điều khoản & Điều kiện</h2>

          <Textarea
            id="termsAndConditions"
            name="termsAndConditions"
            value={formData.termsAndConditions}
            onChange={handleInputChange}
            placeholder="Nhập các điều khoản và điều kiện của sự kiện..."
            rows={6}
          />
        </Card>

        {/* Submit */}
        <div className="flex flex-col items-center gap-4">
          {submitError && (
            <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
              {submitError}
            </div>
          )}

          {submitSuccess && (
            <div className="w-full p-4 bg-green-50 border border-green-200 rounded-lg text-green-600">
              🎉 Tạo sự kiện thành công!
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="w-full md:w-auto px-8"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Đang tạo sự kiện...
              </>
            ) : (
              "Tạo sự kiện"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

