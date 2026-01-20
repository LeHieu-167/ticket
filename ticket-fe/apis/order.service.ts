import api from "@/config/axios.config";

// ==================== TYPES ====================

/**
 * Trạng thái của request trong hàng chờ
 */
export type QueueStatus =
  | "QUEUED" // Đã vào hàng chờ, chưa xử lý
  | "PROCESSING" // Đang xử lý
  | "SUCCESS" // Thành công
  | "FAILED" // Thất bại
  | "NOT_FOUND"; // Không tìm thấy (hết hạn hoặc không tồn tại)

/**
 * Request đặt vé
 * Hỗ trợ Resumable Queue với requestId
 */
export interface OrderRequest {
  /**
   * UUID duy nhất do client tạo
   * Dùng cho cơ chế Resumable Queue
   */
  requestId: string;
  eventId: string;
  ticketQuantity: number;
}

/**
 * Response từ API đặt vé và check status
 */
export interface OrderStatusResponse {
  requestId: string;
  status: QueueStatus;
  message: string;
  orderId?: string;
  isNewRequest: boolean;
  expiredAt?: string;
}

/**
 * Response chi tiết đơn hàng
 */
export interface OrderResponse {
  id: string;
  customerId: string;
  eventId: string;
  ticketQuantity: number;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  paymentTransactionId?: string;
  paymentTime?: string;
  createdAt: string;
  updatedAt?: string;
  expiredAt?: string;
}

// ==================== CONSTANTS ====================

/**
 * Key lưu trong localStorage cho pending request
 */
const PENDING_REQUEST_KEY = "ticket_pending_request";

/**
 * Cấu trúc dữ liệu lưu trong localStorage
 */
interface PendingRequestData {
  requestId: string;
  eventId: string;
  ticketQuantity: number;
  createdAt: number; // timestamp
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Tạo UUID v4
 */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Lấy pending request từ localStorage
 */
function getPendingRequest(): PendingRequestData | null {
  if (typeof window === "undefined") return null;

  const data = localStorage.getItem(PENDING_REQUEST_KEY);
  if (!data) return null;

  try {
    const parsed: PendingRequestData = JSON.parse(data);

    // Kiểm tra xem request có quá cũ không (30 phút)
    const MAX_AGE_MS = 30 * 60 * 1000;
    if (Date.now() - parsed.createdAt > MAX_AGE_MS) {
      localStorage.removeItem(PENDING_REQUEST_KEY);
      return null;
    }

    return parsed;
  } catch {
    localStorage.removeItem(PENDING_REQUEST_KEY);
    return null;
  }
}

/**
 * Lưu pending request vào localStorage
 */
function savePendingRequest(data: PendingRequestData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PENDING_REQUEST_KEY, JSON.stringify(data));
}

/**
 * Xóa pending request khỏi localStorage
 */
function clearPendingRequest(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PENDING_REQUEST_KEY);
}

// ==================== ORDER SERVICE ====================

/**
 * Service xử lý các API liên quan đến đặt vé
 *
 * Hỗ trợ cơ chế Resumable Queue:
 * - Người dùng có thể reload trang mà vẫn giữ vị trí trong hàng chờ
 * - Tự động khôi phục trạng thái khi mở lại trang
 */
export const orderService = {
  // ==================== RESUMABLE QUEUE METHODS ====================

  /**
   * Kiểm tra xem có pending request không (sau khi reload trang)
   * Gọi trong useEffect hoặc ngOnInit
   *
   * @returns Thông tin request đang pending hoặc null
   */
  getPendingOrderRequest(): PendingRequestData | null {
    return getPendingRequest();
  },

  /**
   * Kiểm tra xem có đang trong quá trình đặt vé không
   */
  hasPendingOrder(): boolean {
    return getPendingRequest() !== null;
  },

  /**
   * Xóa pending order (khi đã hoàn thành hoặc user muốn hủy)
   */
  clearPendingOrder(): void {
    clearPendingRequest();
  },

  // ==================== API METHODS ====================

  /**
   * Đặt vé (với Resumable Queue)
   *
   * Logic:
   * 1. Kiểm tra xem đã có pending request chưa
   * 2. Nếu có -> Kiểm tra trạng thái của request đó
   * 3. Nếu chưa -> Tạo request mới với UUID
   *
   * @param eventId ID sự kiện
   * @param ticketQuantity Số lượng vé
   * @returns OrderStatusResponse
   */
  async createOrder(
    eventId: string,
    ticketQuantity: number
  ): Promise<OrderStatusResponse> {
    // 1. Kiểm tra pending request
    const pendingRequest = getPendingRequest();

    if (pendingRequest && pendingRequest.eventId === eventId) {
      // Đã có request cho event này -> Kiểm tra trạng thái
      console.log(
        "🔄 Có pending request, kiểm tra trạng thái:",
        pendingRequest.requestId
      );

      try {
        const status = await this.checkOrderStatus(pendingRequest.requestId);

        // Nếu đã SUCCESS hoặc FAILED -> Xóa pending và có thể tạo request mới
        if (status.status === "SUCCESS" || status.status === "FAILED") {
          clearPendingRequest();

          if (status.status === "FAILED") {
            // Cho phép tạo request mới nếu thất bại
            return await this.createNewOrder(eventId, ticketQuantity);
          }
        }

        return status;
      } catch (error) {
        // Nếu check status lỗi (404, etc.) -> Xóa pending và tạo mới
        console.log("⚠️ Không tìm thấy pending request, tạo mới...");
        clearPendingRequest();
        return await this.createNewOrder(eventId, ticketQuantity);
      }
    }

    // 2. Tạo request mới
    return await this.createNewOrder(eventId, ticketQuantity);
  },

  /**
   * Tạo request đặt vé mới (internal)
   */
  async createNewOrder(
    eventId: string,
    ticketQuantity: number
  ): Promise<OrderStatusResponse> {
    const requestId = generateUUID();

    // Lưu vào localStorage TRƯỚC khi gọi API
    savePendingRequest({
      requestId,
      eventId,
      ticketQuantity,
      createdAt: Date.now(),
    });

    console.log("📤 Tạo order mới với requestId:", requestId);

    try {
      const request: OrderRequest = {
        requestId,
        eventId,
        ticketQuantity,
      };

      const response = await api.post<OrderStatusResponse>(
        "/api/orders",
        request
      );
      return response.data;
    } catch (error) {
      // Nếu API lỗi -> Xóa pending request
      clearPendingRequest();
      throw error;
    }
  },

  /**
   * Kiểm tra trạng thái đơn hàng theo requestId
   * Dùng cho Resumable Queue - kiểm tra sau khi reload trang
   *
   * @param requestId UUID của request
   * @returns OrderStatusResponse
   */
  async checkOrderStatus(requestId: string): Promise<OrderStatusResponse> {
    console.log("🔍 Kiểm tra trạng thái request:", requestId);

    const response = await api.get<OrderStatusResponse>(
      `/api/orders/status/${requestId}`
    );

    const status = response.data;

    // Tự động xóa pending nếu đã hoàn thành
    if (status.status === "SUCCESS" || status.status === "NOT_FOUND") {
      clearPendingRequest();
    }

    return status;
  },

  /**
   * Hủy request trong hàng chờ (nếu chưa được xử lý)
   *
   * @param requestId UUID của request
   */
  async cancelQueuedOrder(requestId: string): Promise<void> {
    console.log("🗑️ Hủy request:", requestId);

    await api.delete(`/api/orders/queue/${requestId}`);
    clearPendingRequest();
  },

  /**
   * Resume order sau khi reload trang
   * Gọi trong useEffect/ngOnInit để khôi phục trạng thái
   *
   * @returns OrderStatusResponse nếu có pending order, null nếu không có
   */
  async resumeOrder(): Promise<OrderStatusResponse | null> {
    const pendingRequest = getPendingRequest();

    if (!pendingRequest) {
      return null;
    }

    console.log("🔄 Resuming order:", pendingRequest.requestId);

    try {
      const status = await this.checkOrderStatus(pendingRequest.requestId);
      return status;
    } catch {
      // Request không tồn tại -> Xóa pending
      clearPendingRequest();
      return null;
    }
  },

  // ==================== STANDARD ORDER METHODS ====================

  /**
   * Lấy danh sách đơn hàng của tôi
   */
  async getMyOrders(): Promise<OrderResponse[]> {
    const response = await api.get<OrderResponse[]>("/api/orders/my-orders");
    return response.data;
  },

  /**
   * Lấy chi tiết một đơn hàng
   */
  async getOrderById(id: string): Promise<OrderResponse> {
    const response = await api.get<OrderResponse>(`/api/orders/${id}`);
    return response.data;
  },
};

export default orderService;

