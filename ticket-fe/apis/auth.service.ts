import api from "@/config/axios.config";

// =============== REQUEST DTOs ===============

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken?: string;
  logoutAll?: boolean;
}

// =============== RESPONSE DTOs ===============

export interface JwtResponse {
  accessToken: string;
  refreshToken: string;
  id: string;
  username: string;
  email: string;
  roles: string[];
}

export interface MessageResponse {
  message: string;
}

// =============== AUTH SERVICE ===============

export const authService = {
  /**
   * Đăng nhập
   * POST /auth/login
   */
  async login(request: LoginRequest): Promise<JwtResponse> {
    const response = await api.post<JwtResponse>("/auth/login", request);
    
    // Lưu tokens vào localStorage
    if (response.data.accessToken) {
      localStorage.setItem("accessToken", response.data.accessToken);
      localStorage.setItem("refreshToken", response.data.refreshToken);
      localStorage.setItem("user", JSON.stringify({
        id: response.data.id,
        username: response.data.username,
        email: response.data.email,
        roles: response.data.roles,
      }));
    }
    
    return response.data;
  },

  /**
   * Đăng ký tài khoản Khách hàng (CUSTOMER)
   * POST /auth/register/customer
   */
  async registerCustomer(request: RegisterRequest): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>("/auth/register/customer", request);
    return response.data;
  },

  /**
   * Đăng ký tài khoản Nhà tổ chức (ORGANIZER)
   * POST /auth/register/organizer
   */
  async registerOrganizer(request: RegisterRequest): Promise<MessageResponse> {
    const response = await api.post<MessageResponse>("/auth/register/organizer", request);
    return response.data;
  },

  /**
   * Làm mới Access Token
   * POST /auth/refresh-token
   */
  async refreshToken(): Promise<JwtResponse> {
    const refreshToken = localStorage.getItem("refreshToken");
    
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }
    
    const response = await api.post<JwtResponse>("/auth/refresh-token", {
      refreshToken,
    });
    
    // Cập nhật tokens mới
    if (response.data.accessToken) {
      localStorage.setItem("accessToken", response.data.accessToken);
      localStorage.setItem("refreshToken", response.data.refreshToken);
    }
    
    return response.data;
  },

  /**
   * Đăng xuất
   * POST /auth/logout
   */
  async logout(logoutAll: boolean = false): Promise<void> {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      
      await api.post<MessageResponse>("/auth/logout", {
        refreshToken,
        logoutAll,
      });
    } finally {
      // Xóa dữ liệu đăng nhập khỏi localStorage
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    }
  },

  /**
   * Kiểm tra đã đăng nhập chưa
   */
  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("accessToken");
  },

  /**
   * Lấy thông tin user từ localStorage
   */
  getCurrentUser(): { id: string; username: string; email: string; roles: string[] } | null {
    if (typeof window === "undefined") return null;
    
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /**
   * Kiểm tra user có role cụ thể
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    return user.roles.includes(role);
  },

  /**
   * Kiểm tra user là Customer
   */
  isCustomer(): boolean {
    return this.hasRole("ROLE_CUSTOMER");
  },

  /**
   * Kiểm tra user là Organizer
   */
  isOrganizer(): boolean {
    return this.hasRole("ROLE_ORGANIZER");
  },

  /**
   * Kiểm tra user là Admin
   */
  isAdmin(): boolean {
    return this.hasRole("ROLE_ADMIN");
  },
};

export default authService;

