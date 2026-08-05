import api from "@/config/axios.config";
import { EventStatus } from "@/types/enums";

export interface TicketTypeRequest {
  name: string;
  price: number;
  totalQuantity: number;
  zoneName?: string;
  description?: string;
  // Added fields
  seatingType?: string;
  displayOrder?: number;
  allowSeatSelection?: boolean;
}

/**
 * Request để tạo sự kiện mới
 */
export interface EventRequest {
  name: string;
  description?: string;
  location: string;
  address?: string;
  eventDate: string; // ISO format: "2024-12-25T18:00:00"
  eventEndDate?: string;
  ticketPrice: number;
  availableTickets: number;
  organizerName?: string;
  bannerImageUrl?: string;
  thumbnailUrl?: string;
  mapImageUrl?: string; // URL ảnh sơ đồ/map địa điểm
  termsAndConditions?: string;
  ticketTypes?: TicketTypeRequest[];
}

/**
 * Response từ API event
 */
export interface EventResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  location: string;
  address?: string;
  eventDate: string;
  eventEndDate?: string;
  ticketPrice: number;
  availableTickets: number;
  totalTickets?: number;
  ticketsSold?: number;      // Số vé đã bán (từ backend)
  totalRevenue?: number;     // Tổng doanh thu (từ backend)
  organizerId: string;
  organizerName?: string;
  bannerImageUrl?: string;
  thumbnailUrl?: string;
  mapImageUrl?: string; // URL ảnh sơ đồ/map địa điểm
  termsAndConditions?: string;
  isActive: boolean;
  status: EventStatus; // Trạng thái sự kiện
  isBuyable: boolean;  // true nếu có thể mua vé (status = ACTIVE và còn vé)
  rejectionReason?: string; // Lý do từ chối/hủy (nếu có)
  createdAt: string;
  updatedAt?: string;
  // Thêm các field mới cho chi tiết sự kiện
  category?: string;
  artists?: ArtistInfo[];
  ticketTypes?: TicketTypeResponse[]; // Danh sách loại vé
}

/**
 * Response loại vé từ API
 */
export interface TicketTypeResponse {
  id: string;
  name: string;
  price: number;
  totalQuantity: number;
  availableQuantity: number;
  soldQuantity: number;  // Số vé đã bán (từ backend)
  revenue: number;       // Doanh thu = soldQuantity * price (từ backend)
  zoneName?: string;
  description?: string;
  seatingType?: string;
  displayOrder?: number;
  allowSeatSelection?: boolean;
  colorCode?: string;
  isActive?: boolean;
}

/**
 * Thông tin nghệ sĩ/diễn giả
 */
export interface ArtistInfo {
  id?: string;
  name: string;
  role?: string; // "Ca sĩ", "DJ", "Diễn giả", etc.
  imageUrl?: string;
  description?: string;
}

/**
 * Tham số tìm kiếm và lọc sự kiện
 */
export interface EventSearchParams {
  keyword?: string;
  location?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
  sortBy?: 'eventDate' | 'ticketPrice' | 'name' | 'createdAt';
  sortDir?: 'asc' | 'desc';
}

/**
 * Response phân trang
 */
export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface OrganizerStatsResponse {
  ticketsSold: number;
  totalRevenue: number;
  totalCustomers: number;
  activeEvents: number;
}

/**
 * Service xử lý các API liên quan đến Event
 */
export const eventService = {
  /**
   * Lấy thống kê Dashboard cho Organizer
   */
  async getOrganizerStats(): Promise<OrganizerStatsResponse> {
    const response = await api.get<OrganizerStatsResponse>("/api/organizer/stats");
    return response.data;
  },

  /**
   * Tạo sự kiện mới (chỉ ORGANIZER)
   */
  async createEvent(request: EventRequest): Promise<EventResponse> {
    const response = await api.post<EventResponse>("/api/events", request);
    return response.data;
  },

  /**
   * Lấy danh sách sự kiện của organizer hiện tại
   */
  async getMyEvents(): Promise<EventResponse[]> {
    const response = await api.get<EventResponse[]>("/api/organizer/my-events");
    return response.data;
  },

  /**
   * Lấy danh sách tất cả sự kiện (công khai)
   */
  async getAllEvents(): Promise<EventResponse[]> {
    const response = await api.get<EventResponse[]>("/api/events");
    return response.data;
  },

  /**
   * Lấy chi tiết một sự kiện theo ID
   */
  async getEventById(id: string): Promise<EventResponse> {
    const response = await api.get<EventResponse>(`/api/events/${id}`);
    return response.data;
  },

  /**
   * Lấy chi tiết sự kiện theo slug (SEO-friendly URL)
   */
  async getEventBySlug(slug: string): Promise<EventResponse> {
    const response = await api.get<EventResponse>(`/api/events/slug/${slug}`);
    return response.data;
  },

  /**
   * Tìm kiếm và lọc sự kiện
   */
  async searchEvents(params: EventSearchParams): Promise<EventResponse[]> {
    const queryParams = new URLSearchParams();
    
    if (params.keyword) queryParams.append('keyword', params.keyword);
    if (params.location) queryParams.append('location', params.location);
    if (params.category) queryParams.append('category', params.category);
    if (params.minPrice !== undefined) queryParams.append('minPrice', params.minPrice.toString());
    if (params.maxPrice !== undefined) queryParams.append('maxPrice', params.maxPrice.toString());
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDir) queryParams.append('sortDir', params.sortDir);

    const queryString = queryParams.toString();
    const url = queryString ? `/api/events/search?${queryString}` : '/api/events';
    
    try {
      const response = await api.get<EventResponse[]>(url);
      return response.data;
    } catch (error) {
      // Fallback to getAllEvents nếu API search chưa có
      console.warn('Search API not available, falling back to getAllEvents');
      return this.getAllEvents();
    }
  },

  /**
   * Lấy danh sách địa điểm có sẵn
   */
  async getLocations(): Promise<string[]> {
    try {
      const response = await api.get<string[]>('/api/events/locations');
      return response.data;
    } catch {
      // Fallback nếu API chưa có
      return ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ'];
    }
  },

  /**
   * Lấy danh sách thể loại có sẵn
   */
  async getCategories(): Promise<string[]> {
    try {
      const response = await api.get<string[]>('/api/events/categories');
      return response.data;
    } catch {
      // Fallback nếu API chưa có
      return ['Âm nhạc', 'Thể thao', 'Nghệ thuật', 'Hội thảo', 'Workshop', 'Festival'];
    }
  },

  // ==================== ORGANIZER METHODS ====================

  /**
   * Cập nhật sự kiện (chỉ ORGANIZER - owner)
   */
  async updateEvent(id: string, request: EventRequest): Promise<EventResponse> {
    const response = await api.put<EventResponse>(`/api/events/${id}`, request);
    return response.data;
  },

  /**
   * Xóa sự kiện (chỉ ORGANIZER - owner)
   */
  async deleteEvent(id: string): Promise<void> {
    await api.delete(`/api/events/${id}`);
  },

  /**
   * Gửi sự kiện để duyệt
   */
  async submitForApproval(id: string): Promise<EventResponse> {
    const response = await api.put<EventResponse>(`/api/events/${id}/submit`);
    return response.data;
  },

  /**
   * Bật/tắt trạng thái bán vé của sự kiện (chỉ ORGANIZER - owner)
   * Toggle giữa ACTIVE và STOP_SELLING
   * @param id ID sự kiện
   * @param active true = ACTIVE (mở bán), false = STOP_SELLING (ngừng bán), undefined = toggle
   */
  async toggleEventSales(id: string, active?: boolean): Promise<EventResponse> {
    const params = active !== undefined ? { active } : {};
    const response = await api.put<EventResponse>(`/api/events/${id}/toggle-sales`, null, { params });
    return response.data;
  },

  /**
   * Ngừng bán vé (ACTIVE -> STOP_SELLING)
   */
  async stopSelling(id: string): Promise<EventResponse> {
    const response = await api.put<EventResponse>(`/api/events/${id}/stop-selling`);
    return response.data;
  },

  /**
   * Mở lại bán vé (STOP_SELLING -> ACTIVE)
   */
  async resumeSelling(id: string): Promise<EventResponse> {
    const response = await api.put<EventResponse>(`/api/events/${id}/resume-selling`);
    return response.data;
  },

  /**
   * Hủy sự kiện (-> CANCELLED)
   * Dùng khi đã bán vé và cần kích hoạt quy trình hoàn tiền
   */
  async cancelEvent(id: string, reason?: string): Promise<EventResponse> {
    const params = reason ? { reason } : {};
    const response = await api.put<EventResponse>(`/api/events/${id}/cancel`, null, { params });
    return response.data;
  },

  // ==================== ADMIN METHODS ====================

  /**
   * Lấy tất cả sự kiện (Admin)
   */
  async adminGetAllEvents(status?: EventStatus): Promise<EventResponse[]> {
    const url = status 
      ? `/api/admin/events?status=${status}` 
      : '/api/admin/events';
    const response = await api.get<EventResponse[]>(url);
    return response.data;
  },

  /**
   * Lấy sự kiện chờ duyệt (Admin)
   */
  async adminGetPendingEvents(): Promise<EventResponse[]> {
    const response = await api.get<EventResponse[]>('/api/admin/events/pending');
    return response.data;
  },

  /**
   * Duyệt sự kiện (Admin)
   */
  async adminApproveEvent(id: string): Promise<EventResponse> {
    const response = await api.put<EventResponse>(`/api/admin/events/${id}/approve`);
    return response.data;
  },

  /**
   * Từ chối sự kiện (Admin)
   */
  async adminRejectEvent(id: string, reason: string): Promise<EventResponse> {
    const response = await api.put<EventResponse>(`/api/admin/events/${id}/reject`, null, { 
      params: { reason } 
    });
    return response.data;
  },

  /**
   * Hủy sự kiện (Admin)
   */
  async adminCancelEvent(id: string, reason: string): Promise<EventResponse> {
    const response = await api.put<EventResponse>(`/api/admin/events/${id}/cancel`, null, {
      params: { reason }
    });
    return response.data;
  },

  /**
   * Tạo loại vé cho sự kiện
   */
  async createTicketType(request: TicketTypeRequest & { eventId: string }): Promise<any> {
    const response = await api.post("/api/tickets/types", request);
    return response.data;
  },
};

export default eventService;
