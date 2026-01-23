import api from "@/config/axios.config";

// ==================== TYPES ====================

/**
 * Trạng thái vé
 */
export type TicketStatus = 
  | "ACTIVE"      // Vé còn hiệu lực
  | "USED"        // Đã sử dụng (check-in)
  | "CANCELLED"   // Đã hủy
  | "EXPIRED";    // Hết hạn

/**
 * Response chi tiết vé
 * Mapping từ backend TicketResponse DTO
 */
export interface TicketResponse {
  id: string;
  ticketCode: string;
  orderId: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  eventAddress?: string;
  // Ticket type info
  ticketTypeId?: number;
  ticketTypeName?: string;
  ticketType: string; // Alias for ticketTypeName (for backwards compatibility)
  ticketPrice?: number;
  price: number; // Alias for ticketPrice (for backwards compatibility)
  // Seating info
  seatingType?: string;
  zoneName?: string;
  rowName?: string;
  seatNumber?: string;
  locationDisplay?: string;
  seatInfo?: string; // Alias for locationDisplay (for backwards compatibility)
  // Status
  status: TicketStatus;
  qrCodeBase64?: string;
  qrCodeDataUri?: string;
  checkedInAt?: string;
  createdAt: string;
  updatedAt?: string;
  // Holder info
  holderName?: string;
  holderEmail?: string;
  holderPhone?: string;
  // Buyer info (alias for holder)
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
}

/**
 * Response check-in vé
 */
export interface CheckInResponse {
  success: boolean;
  message: string;
  ticket?: TicketResponse;
  checkedInAt?: string;
}

/**
 * Request check-in vé
 */
export interface CheckInRequest {
  ticketCode: string;
}

/**
 * Response đơn hàng với vé
 */
export interface OrderWithTicketsResponse {
  orderId: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  tickets: TicketResponse[];
  buyerInfo: {
    name: string;
    email: string;
    phone: string;
  };
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Transform backend response to frontend-friendly format
 * Maps ticketTypeName -> ticketType, ticketPrice -> price, etc.
 */
function transformTicketResponse(ticket: any): TicketResponse {
  return {
    ...ticket,
    // Map field names for backwards compatibility
    ticketType: ticket.ticketTypeName || ticket.ticketType || 'Unknown',
    price: ticket.ticketPrice || ticket.price || 0,
    seatInfo: ticket.locationDisplay || ticket.seatInfo || 
      [ticket.zoneName, ticket.rowName, ticket.seatNumber].filter(Boolean).join(' - ') || undefined,
    buyerName: ticket.holderName || ticket.buyerName,
    buyerEmail: ticket.holderEmail || ticket.buyerEmail,
    buyerPhone: ticket.holderPhone || ticket.buyerPhone,
  };
}

// ==================== TICKET SERVICE ====================

export const ticketService = {
  /**
   * Lấy danh sách vé của tôi
   */
  async getMyTickets(): Promise<TicketResponse[]> {
    const response = await api.get<TicketResponse[]>("/api/tickets/my-tickets");
    return response.data.map(transformTicketResponse);
  },

  /**
   * Lấy chi tiết vé theo ID
   */
  async getTicketById(id: string): Promise<TicketResponse> {
    const response = await api.get<TicketResponse>(`/api/tickets/${id}`);
    return transformTicketResponse(response.data);
  },

  /**
   * Lấy chi tiết vé theo mã vé
   */
  async getTicketByCode(code: string): Promise<TicketResponse> {
    const response = await api.get<TicketResponse>(`/api/tickets/code/${code}`);
    return transformTicketResponse(response.data);
  },

  /**
   * Lấy danh sách vé theo đơn hàng
   */
  async getTicketsByOrderId(orderId: string): Promise<TicketResponse[]> {
    const response = await api.get<TicketResponse[]>(`/api/tickets/order/${orderId}`);
    return response.data.map(transformTicketResponse);
  },

  /**
   * Lấy chi tiết đơn hàng kèm vé
   */
  async getOrderWithTickets(orderId: string): Promise<OrderWithTicketsResponse> {
    const response = await api.get<OrderWithTicketsResponse>(`/api/orders/${orderId}/tickets`);
    return response.data;
  },

  /**
   * Tải QR Code dạng PNG
   */
  async downloadQRCode(ticketCode: string): Promise<Blob> {
    const response = await api.get(`/api/tickets/qr/${ticketCode}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Check-in vé (Organizer)
   */
  async checkInTicket(ticketCode: string): Promise<CheckInResponse> {
    // Trim và encode ticketCode để tránh lỗi URL
    const cleanedCode = encodeURIComponent(ticketCode.trim());
    const response = await api.post<CheckInResponse>(`/api/tickets/check-in/${cleanedCode}`);
    return response.data;
  },

  /**
   * Gửi lại vé qua email
   */
  async resendTicketEmail(ticketId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/api/tickets/${ticketId}/resend-email`);
    return response.data;
  },

  /**
   * Parse nội dung QR Code
   * Format: TICKET:{code}|EVENT:{eventId}|ORDER:{orderId}
   */
  parseQRContent(qrContent: string): { ticketCode: string; eventId: string; orderId: string } | null {
    try {
      const parts = qrContent.split('|');
      const result: any = {};
      
      for (const part of parts) {
        const [key, value] = part.split(':');
        if (key === 'TICKET') result.ticketCode = value;
        if (key === 'EVENT') result.eventId = value;
        if (key === 'ORDER') result.orderId = value;
      }
      
      if (result.ticketCode) {
        return result;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Tạo Data URI từ base64
   */
  createDataUri(base64: string): string {
    if (base64.startsWith('data:')) {
      return base64;
    }
    return `data:image/png;base64,${base64}`;
  },

  // ==================== ORGANIZER METHODS ====================

  /**
   * Lấy danh sách vé của một sự kiện (Organizer)
   */
  async getEventTickets(eventId: string): Promise<TicketResponse[]> {
    const response = await api.get<TicketResponse[]>(`/api/organizer/events/${eventId}/tickets`);
    return response.data;
  },

  /**
   * Lấy danh sách đơn hàng của một sự kiện (Organizer)
   */
  async getEventOrders(eventId: string): Promise<OrderWithTicketsResponse[]> {
    const response = await api.get<OrderWithTicketsResponse[]>(`/api/organizer/events/${eventId}/orders`);
    return response.data;
  },

  /**
   * Lấy tất cả đơn hàng của organizer (Organizer)
   */
  async getAllOrganizerOrders(): Promise<OrderWithTicketsResponse[]> {
    const response = await api.get<OrderWithTicketsResponse[]>('/api/organizer/orders');
    return response.data;
  },

  /**
   * Tìm kiếm vé theo nhiều tiêu chí (Organizer)
   */
  async searchTickets(params: {
    eventId?: string;
    ticketCode?: string;
    buyerEmail?: string;
    buyerPhone?: string;
    status?: TicketStatus;
  }): Promise<TicketResponse[]> {
    const response = await api.get<TicketResponse[]>('/api/organizer/tickets/search', { params });
    return response.data;
  }
};

export default ticketService;

