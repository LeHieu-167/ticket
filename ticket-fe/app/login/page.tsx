"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Ticket, 
  Eye, 
  EyeOff, 
  LogIn, 
  ArrowLeft,
  Loader2,
  Sparkles,
  Music,
  Star,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import authService, { LoginRequest } from "@/apis/auth.service";

export default function LoginPage() {
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
      
      // Điều hướng theo role
      if (response.roles.includes("ROLE_ORGANIZER")) {
        router.push("/organizer/dashboard");
      } else if (response.roles.includes("ROLE_ADMIN")) {
        router.push("/admin/dashboard");
      } else {
        // CUSTOMER - về trang chủ với header có dropdown tài khoản
        router.push("/");
        router.refresh();
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
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" />
        
        {/* Animated Patterns */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-40 right-20 w-96 h-96 bg-pink-300/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-indigo-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
        </div>

        {/* Floating Icons */}
        <div className="absolute inset-0 overflow-hidden">
          <Music className="absolute top-[15%] left-[20%] w-12 h-12 text-white/30 animate-bounce" style={{ animationDuration: "3s" }} />
          <Sparkles className="absolute top-[35%] right-[25%] w-8 h-8 text-yellow-300/50 animate-pulse" />
          <Star className="absolute bottom-[30%] left-[30%] w-10 h-10 text-white/20 animate-bounce" style={{ animationDuration: "4s" }} />
          <Ticket className="absolute top-[60%] right-[15%] w-16 h-16 text-white/20 rotate-12 animate-pulse" style={{ animationDelay: "0.5s" }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <Link href="/" className="flex items-center gap-3 mb-12 group">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm group-hover:bg-white/20 transition-all">
              <Ticket className="h-8 w-8" />
            </div>
            <span className="text-2xl font-bold tracking-tight">TicketHub</span>
          </Link>
          
          <h1 className="text-5xl font-bold leading-tight mb-6">
            Chào mừng<br />
            trở lại! 🎉
          </h1>
          
          <p className="text-xl text-white/80 leading-relaxed max-w-md">
            Đăng nhập để tiếp tục khám phá và đặt vé cho những sự kiện 
            đỉnh cao đang chờ đón bạn.
          </p>

          {/* Stats */}
          <div className="flex gap-12 mt-16">
            <div>
              <p className="text-4xl font-bold">50K+</p>
              <p className="text-white/60 mt-1">Sự kiện</p>
            </div>
            <div>
              <p className="text-4xl font-bold">1M+</p>
              <p className="text-white/60 mt-1">Người dùng</p>
            </div>
            <div>
              <p className="text-4xl font-bold">99%</p>
              <p className="text-white/60 mt-1">Hài lòng</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <header className="p-6 flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Về trang chủ</span>
          </Link>
          
          <Link href="/register" className="text-sm">
            <span className="text-slate-500">Chưa có tài khoản? </span>
            <span className="text-indigo-600 font-semibold hover:text-indigo-700">Đăng ký</span>
          </Link>
        </header>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
              <Ticket className="h-8 w-8 text-indigo-600" />
              <span className="text-2xl font-bold text-slate-900">TicketHub</span>
            </div>

            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-3">
                Đăng nhập
              </h2>
              <p className="text-slate-500">
                Nhập thông tin tài khoản để tiếp tục
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
                  placeholder="Nhập tên đăng nhập"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="h-12 px-4 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-700 font-medium">
                    Mật khẩu
                  </Label>
                  <Link 
                    href="/forgot-password" 
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="h-12 px-4 pr-12 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
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
                className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-base shadow-lg shadow-indigo-200 transition-all hover:shadow-xl hover:shadow-indigo-300"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang đăng nhập...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Đăng nhập
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-400">hoặc</span>
              </div>
            </div>

            {/* Social Login */}
            <div className="grid grid-cols-2 gap-4">
              <Button 
                type="button" 
                variant="outline" 
                className="h-12 border-slate-200 hover:bg-slate-50"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="h-12 border-slate-200 hover:bg-slate-50"
              >
                <svg className="w-5 h-5 mr-2" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </Button>
            </div>

            {/* Terms */}
            <p className="mt-8 text-center text-xs text-slate-400 leading-relaxed">
              Bằng cách đăng nhập, bạn đồng ý với{" "}
              <Link href="/terms" className="text-indigo-600 hover:underline">
                Điều khoản dịch vụ
              </Link>{" "}
              và{" "}
              <Link href="/privacy" className="text-indigo-600 hover:underline">
                Chính sách bảo mật
              </Link>{" "}
              của chúng tôi.
            </p>

            {/* Admin Access */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <Link href="/admin/login">
                <Button 
                  variant="outline" 
                  className="w-full h-11 border-slate-300 text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Quản lý hệ thống
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

