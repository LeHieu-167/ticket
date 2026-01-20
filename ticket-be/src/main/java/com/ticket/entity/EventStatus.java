package com.ticket.entity;

/**
 * Trạng thái của sự kiện
 * - DRAFT: Bản nháp (organizer chưa submit)
 * - PENDING_APPROVAL: Chờ admin duyệt
 * - ACTIVE: Đã duyệt, đang bán vé bình thường
 * - REJECTED: Bị từ chối bởi admin
 * - STOP_SELLING: Ngừng bán vé (tạm dừng, sự kiện vẫn còn hiển thị)
 * - CANCELLED: Đã hủy (kích hoạt quy trình hoàn tiền nếu có)
 * - COMPLETED: Sự kiện đã kết thúc
 * - DELETED: Đã xóa (Soft Delete - xóa mềm)
 */
public enum EventStatus {
    DRAFT,
    PENDING_APPROVAL,
    ACTIVE,
    REJECTED,
    STOP_SELLING,
    CANCELLED,
    COMPLETED,
    DELETED
}
