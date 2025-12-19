// lib/axios.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

const api: AxiosInstance = axios.create({
  // Backend Spring Boot chạy trên port 8080
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  timeout: 30_000, // 30s cho upload file
  withCredentials: true,
});

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Lấy token từ localStorage (hoặc cookie) và thêm vào header
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Xử lý lỗi 401 - Unauthorized
    if (error.response?.status === 401) {
      // Có thể redirect về trang login hoặc refresh token
      if (typeof window !== "undefined") {
        // localStorage.removeItem("accessToken");
        // window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
