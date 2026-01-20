"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Shield, 
  Eye, 
  EyeOff, 
  LogIn, 
  ArrowLeft,
  Loader2,
  Lock,
  Server,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import authService, { LoginRequest } from "@/apis/auth.service";

export default function AdminLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<LoginRequest>({
    username: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login(formData);
      
      // Kiểm tra xem có phải admin không
      if (response.roles.includes("ROLE_ADMIN")) {
        router.push("/admin/dashboard");
      } else {
        // Không phải admin - đăng xuất và báo lỗi
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setError("Tài khoản này không có quyền truy cập quản trị hệ thống.");
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Admin themed */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Dark gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }} />
        </div>
        
        {/* Animated glow */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-72 h-72 bg-red-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-40 right-20 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        {/* Floating Icons */}
        <div className="absolute inset-0 overflow-hidden">
          <Lock className="absolute top-[15%] left-[20%] w-12 h-12 text-red-400/30 animate-pulse" />
          <Server className="absolute top-[40%] right-[25%] w-10 h-10 text-orange-400/30 animate-pulse" style={{ animationDelay: "0.5s" }} />
          <Database className="absolute bottom-[25%] left-[25%] w-10 h-10 text-yellow-400/30 animate-pulse" style={{ animationDelay: "1s" }} />
          <Shield className="absolute top-[60%] right-[15%] w-16 h-16 text-red-400/20 animate-pulse" style={{ animationDelay: "1.5s" }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-12">
            <div className="p-3 bg-red-500/20 rounded-2xl backdrop-blur-sm border border-red-500/30">
              <Shield className="h-8 w-8 text-red-400" />
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight">TicketHub</span>
              <p className="text-xs text-red-400 font-medium">ADMIN PORTAL</p>
            </div>
          </div>
          
          <h1 className="text-5xl font-bold leading-tight mb-6">
            Quản trị<br />
            Hệ thống 🔐
          </h1>
          
          <p className="text-xl text-slate-400 leading-relaxed max-w-md">
            Truy cập bảng điều khiển quản trị để quản lý 
            sự kiện, người dùng và cấu hình hệ thống.
          </p>

          {/* Security notice */}
          <div className="mt-12 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-red-400" />
              <p className="text-sm text-slate-300">
                Khu vực này chỉ dành cho quản trị viên được ủy quyền.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {/* Header */}
        <header className="p-6 flex items-center justify-between">
          <Link 
            href="/login" 
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Đăng nhập thường</span>
          </Link>
        </header>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
              <Shield className="h-8 w-8 text-red-500" />
              <div className="text-center">
                <span className="text-2xl font-bold text-slate-900">TicketHub</span>
                <p className="text-xs text-red-500 font-medium">ADMIN</p>
              </div>
            </div>

            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl mb-4">
                <Shield className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">
                Đăng nhập Admin
              </h2>
              <p className="text-slate-500">
                Nhập thông tin tài khoản quản trị viên
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600 text-center font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-700 font-medium">
                  Tên đăng nhập
                </Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Nhập tên đăng nhập admin"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="h-12 px-4 bg-white border-slate-200 focus:border-red-500 focus:ring-red-500 transition-colors"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium">
                  Mật khẩu
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="h-12 px-4 pr-12 bg-white border-slate-200 focus:border-red-500 focus:ring-red-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold text-base shadow-lg shadow-red-200 transition-all hover:shadow-xl hover:shadow-red-300"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang xác thực...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Đăng nhập Admin
                  </>
                )}
              </Button>
            </form>

            {/* Security notice */}
            <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-700 text-center leading-relaxed">
                ⚠️ Mọi hoạt động đăng nhập đều được ghi lại. 
                Việc truy cập trái phép sẽ bị xử lý theo quy định.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

