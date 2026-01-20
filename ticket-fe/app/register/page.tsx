"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Ticket, 
  Eye, 
  EyeOff, 
  UserPlus, 
  ArrowLeft,
  Loader2,
  User,
  Building2,
  Check,
  Sparkles,
  Music,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import authService, { RegisterRequest } from "@/apis/auth.service";

type AccountType = "customer" | "organizer";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<AccountType>("customer");
  
  const [formData, setFormData] = useState<RegisterRequest & { confirmPassword: string }>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phoneNumber: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp!");
      return false;
    }
    
    if (formData.password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự!");
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Email không hợp lệ!");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { confirmPassword, ...registerData } = formData;
      
      if (accountType === "customer") {
        await authService.registerCustomer(registerData);
        setSuccess("Đăng ký tài khoản Khách hàng thành công!");
      } else {
        await authService.registerOrganizer(registerData);
        setSuccess("Đăng ký tài khoản Nhà tổ chức thành công!");
      }
      
      // Chuyển đến trang đăng nhập sau 2 giây
      setTimeout(() => {
        router.push("/login");
      }, 2000);
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || "Đăng ký thất bại. Vui lòng thử lại.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Gradient Background - Different from login */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600" />
        
        {/* Animated Patterns */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-40 right-20 w-96 h-96 bg-emerald-300/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-cyan-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
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
            Tham gia ngay<br />
            hôm nay! 🚀
          </h1>
          
          <p className="text-xl text-white/80 leading-relaxed max-w-md">
            Tạo tài khoản để trải nghiệm đặt vé dễ dàng hoặc bắt đầu 
            tổ chức những sự kiện tuyệt vời của riêng bạn.
          </p>

          {/* Benefits */}
          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <Check className="w-4 h-4" />
              </div>
              <span>Đặt vé nhanh chóng, an toàn</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <Check className="w-4 h-4" />
              </div>
              <span>Nhận thông báo sự kiện yêu thích</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <Check className="w-4 h-4" />
              </div>
              <span>Quản lý vé và lịch sử đặt hàng</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Register Form */}
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
          
          <Link href="/login" className="text-sm">
            <span className="text-slate-500">Đã có tài khoản? </span>
            <span className="text-emerald-600 font-semibold hover:text-emerald-700">Đăng nhập</span>
          </Link>
        </header>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-6 py-8 overflow-auto">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
              <Ticket className="h-8 w-8 text-emerald-600" />
              <span className="text-2xl font-bold text-slate-900">TicketHub</span>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-3">
                Tạo tài khoản
              </h2>
              <p className="text-slate-500">
                Chọn loại tài khoản phù hợp với bạn
              </p>
            </div>

            {/* Account Type Selector */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <button
                type="button"
                onClick={() => setAccountType("customer")}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  accountType === "customer"
                    ? "border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${
                  accountType === "customer" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  <User className="w-6 h-6" />
                </div>
                <p className={`font-semibold ${accountType === "customer" ? "text-emerald-700" : "text-slate-700"}`}>
                  Khách hàng
                </p>
                <p className="text-xs text-slate-500 mt-1">Đặt vé sự kiện</p>
              </button>

              <button
                type="button"
                onClick={() => setAccountType("organizer")}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  accountType === "organizer"
                    ? "border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${
                  accountType === "organizer" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  <Building2 className="w-6 h-6" />
                </div>
                <p className={`font-semibold ${accountType === "organizer" ? "text-emerald-700" : "text-slate-700"}`}>
                  Nhà tổ chức
                </p>
                <p className="text-xs text-slate-500 mt-1">Tạo & quản lý sự kiện</p>
              </button>
            </div>

            {/* Messages */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600 text-center font-medium">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-sm text-emerald-600 text-center font-medium">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-slate-700 font-medium">
                  Họ và tên <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Nhập họ và tên"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="h-12 px-4 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                />
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-700 font-medium">
                  Tên đăng nhập <span className="text-red-500">*</span>
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

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Nhập địa chỉ email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="h-12 px-4 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-slate-700 font-medium">
                  Số điện thoại
                </Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  placeholder="Nhập số điện thoại (không bắt buộc)"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="h-12 px-4 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium">
                  Mật khẩu <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
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

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">
                  Xác nhận mật khẩu <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Nhập lại mật khẩu"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="h-12 px-4 pr-12 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || !!success}
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-base shadow-lg shadow-emerald-200 transition-all hover:shadow-xl hover:shadow-emerald-300"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang đăng ký...
                  </>
                ) : success ? (
                  <>
                    <Check className="w-5 h-5" />
                    Đăng ký thành công!
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Đăng ký {accountType === "customer" ? "Khách hàng" : "Nhà tổ chức"}
                  </>
                )}
              </Button>
            </form>

            {/* Terms */}
            <p className="mt-6 text-center text-xs text-slate-400 leading-relaxed">
              Bằng cách đăng ký, bạn đồng ý với{" "}
              <Link href="/terms" className="text-emerald-600 hover:underline">
                Điều khoản dịch vụ
              </Link>{" "}
              và{" "}
              <Link href="/privacy" className="text-emerald-600 hover:underline">
                Chính sách bảo mật
              </Link>{" "}
              của chúng tôi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

