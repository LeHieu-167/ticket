/**
 * Trạng thái của sự kiện trong hệ thống
 */
export enum EventStatus {
  DRAFT = "DRAFT",                      // Bản nháp
  PENDING_APPROVAL = "PENDING_APPROVAL", // Chờ duyệt
  ACTIVE = "ACTIVE",                    // Đang bán vé
  REJECTED = "REJECTED",                // Bị từ chối
  STOP_SELLING = "STOP_SELLING",        // Ngừng bán vé (tạm dừng)
  CANCELLED = "CANCELLED",              // Đã hủy (kích hoạt hoàn tiền)
  COMPLETED = "COMPLETED",              // Đã kết thúc
  DELETED = "DELETED"                   // Đã xóa (Soft Delete)
}

/**
 * Trạng thái vé
 */
export enum TicketStatus {
  ACTIVE = "ACTIVE",       // Còn hiệu lực
  USED = "USED",          // Đã sử dụng
  CANCELLED = "CANCELLED", // Đã hủy
  EXPIRED = "EXPIRED"     // Hết hạn
}

/**
 * Trạng thái đơn hàng
 */
export enum OrderStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  FAILED = "FAILED"
}

/**
 * Trạng thái thanh toán
 */
export enum PaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED"
}

/**
 * Vai trò người dùng
 */
export enum UserRole {
  CUSTOMER = "CUSTOMER",
  ORGANIZER = "ORGANIZER",
  ADMIN = "ADMIN"
}

/**
 * Helper functions để hiển thị status
 */
export const EventStatusDisplay: Record<EventStatus, { label: string; color: string; bgColor: string }> = {
  [EventStatus.DRAFT]: { 
    label: "Bản nháp", 
    color: "text-slate-600", 
    bgColor: "bg-slate-100" 
  },
  [EventStatus.PENDING_APPROVAL]: { 
    label: "Chờ duyệt", 
    color: "text-yellow-700", 
    bgColor: "bg-yellow-100" 
  },
  [EventStatus.ACTIVE]: { 
    label: "Đang bán", 
    color: "text-green-700", 
    bgColor: "bg-green-100" 
  },
  [EventStatus.REJECTED]: { 
    label: "Bị từ chối", 
    color: "text-red-700", 
    bgColor: "bg-red-100" 
  },
  [EventStatus.STOP_SELLING]: { 
    label: "Ngừng bán", 
    color: "text-orange-700", 
    bgColor: "bg-orange-100" 
  },
  [EventStatus.CANCELLED]: { 
    label: "Đã hủy", 
    color: "text-gray-700", 
    bgColor: "bg-gray-100" 
  },
  [EventStatus.COMPLETED]: { 
    label: "Đã kết thúc", 
    color: "text-blue-700", 
    bgColor: "bg-blue-100" 
  },
  [EventStatus.DELETED]: { 
    label: "Đã xóa", 
    color: "text-gray-400", 
    bgColor: "bg-gray-50" 
  }
};
