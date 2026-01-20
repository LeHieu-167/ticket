import api from "@/config/axios.config";
import { EventResponse } from "./event.service";

// ==================== USER TYPES ====================

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  address?: string;
  avatarUrl?: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
}

// ==================== STATS TYPES ====================

export interface AdminDashboardStats {
  totalEvents: number;
  totalUsers: number;
  totalRevenue: number;
  totalTicketsSold: number;
  pendingEventsCount: number;
  activeEventsCount: number;
  customersCount: number;
  organizersCount: number;
}

// ==================== ADMIN SERVICE ====================

export const adminService = {
  // ==================== USER MANAGEMENT ====================

  /**
   * Lấy danh sách tất cả người dùng (Admin only)
   * GET /api/admin/users
   */
  async getAllUsers(): Promise<UserResponse[]> {
    const response = await api.get<UserResponse[]>("/api/admin/users");
    return response.data;
  },

  /**
   * Lấy chi tiết người dùng theo ID (Admin only)
   * GET /api/admin/users/{id}
   */
  async getUserById(id: string): Promise<UserResponse> {
    const response = await api.get<UserResponse>(`/api/admin/users/${id}`);
    return response.data;
  },

  /**
   * Chặn tài khoản người dùng (Admin only)
   * PUT /api/admin/users/{id}/block
   */
  async blockUser(id: string): Promise<UserResponse> {
    const response = await api.put<UserResponse>(`/api/admin/users/${id}/block`);
    return response.data;
  },

  /**
   * Mở chặn tài khoản người dùng (Admin only)
   * PUT /api/admin/users/{id}/unblock
   */
  async unblockUser(id: string): Promise<UserResponse> {
    const response = await api.put<UserResponse>(`/api/admin/users/${id}/unblock`);
    return response.data;
  },

  /**
   * Xóa tài khoản người dùng (Admin only)
   * Chỉ xóa được tài khoản đã bị chặn
   * DELETE /api/admin/users/{id}
   */
  async deleteUser(id: string): Promise<void> {
    await api.delete(`/api/admin/users/${id}`);
  },

  // ==================== DASHBOARD STATS ====================

  /**
   * Lấy thống kê dashboard cho Admin
   * Tính toán từ các API hiện có
   */
  async getDashboardStats(): Promise<AdminDashboardStats> {
    try {
      // Gọi song song các API để lấy dữ liệu
      const [usersResponse, eventsResponse] = await Promise.all([
        api.get<UserResponse[]>("/api/admin/users"),
        api.get<EventResponse[]>("/api/admin/events"),
      ]);

      const users = usersResponse.data;
      const events = eventsResponse.data;

      // Tính toán stats
      const stats: AdminDashboardStats = {
        totalEvents: events.length,
        totalUsers: users.length,
        totalRevenue: 0, // Sẽ cần API riêng để tính
        totalTicketsSold: 0, // Sẽ cần API riêng để tính
        pendingEventsCount: events.filter(e => e.status === 'PENDING_APPROVAL').length,
        activeEventsCount: events.filter(e => e.status === 'ACTIVE').length,
        customersCount: users.filter(u => u.roles.includes('ROLE_CUSTOMER')).length,
        organizersCount: users.filter(u => u.roles.includes('ROLE_ORGANIZER')).length,
      };

      // Tính tổng số vé có sẵn từ các sự kiện active
      stats.totalTicketsSold = events
        .filter(e => e.status === 'ACTIVE')
        .reduce((sum, e) => sum + (e.totalTickets || 0) - (e.availableTickets || 0), 0);

      // Tính doanh thu ước tính (số vé bán * giá trung bình)
      const activeEvents = events.filter(e => e.status === 'ACTIVE' || e.status === 'COMPLETED');
      if (activeEvents.length > 0) {
        stats.totalRevenue = activeEvents.reduce((sum, e) => {
          const soldTickets = (e.totalTickets || 0) - (e.availableTickets || 0);
          return sum + soldTickets * (e.ticketPrice || 0);
        }, 0);
      }

      return stats;
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      // Trả về stats mặc định nếu lỗi
      return {
        totalEvents: 0,
        totalUsers: 0,
        totalRevenue: 0,
        totalTicketsSold: 0,
        pendingEventsCount: 0,
        activeEventsCount: 0,
        customersCount: 0,
        organizersCount: 0,
      };
    }
  },

  /**
   * Lấy danh sách sự kiện chờ duyệt gần đây (tối đa 5)
   */
  async getRecentPendingEvents(limit: number = 5): Promise<EventResponse[]> {
    const response = await api.get<EventResponse[]>("/api/admin/events/pending");
    return response.data.slice(0, limit);
  },
};

export default adminService;
