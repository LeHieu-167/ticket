import api from "@/config/axios.config";

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
  termsAndConditions?: string;
}

/**
 * Response từ API event
 */
export interface EventResponse {
  id: number;
  name: string;
  description?: string;
  location: string;
  address?: string;
  eventDate: string;
  eventEndDate?: string;
  ticketPrice: number;
  availableTickets: number;
  totalTickets?: number;
  organizerId: number;
  organizerName?: string;
  bannerImageUrl?: string;
  thumbnailUrl?: string;
  termsAndConditions?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Service xử lý các API liên quan đến Event
 */
export const eventService = {
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
   * Lấy chi tiết một sự kiện
   */
  async getEventById(id: number): Promise<EventResponse> {
    const response = await api.get<EventResponse>(`/api/events/${id}`);
    return response.data;
  },
};

export default eventService;

