"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { 
  ChevronLeft, User, Mail, Phone, MapPin, 
  Camera, Save, Loader2, CheckCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Header } from "@/components/layouts/Header";
import { ImageUpload } from "@/components/ui/image-upload";
import { useToast } from "@/hooks/use-toast";
import api from "@/config/axios.config";

// Type khớp với Backend DTO
type ProfileFormValues = {
  fullName: string;
  phoneNumber: string;
  address: string;
  avatarUrl: string;
};

export default function AccountPage() {
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const [email, setEmail] = useState("");
  
  // Setup form
  const form = useForm<ProfileFormValues>({
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      address: "",
      avatarUrl: ""
    }
  });

  // 1. Load dữ liệu cũ khi vào trang
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/api/users/profile");
        // Đổ dữ liệu vào form
        form.reset({
          fullName: res.data.fullName || "",
          phoneNumber: res.data.phoneNumber || "",
          address: res.data.address || "",
          avatarUrl: res.data.avatarUrl || ""
        });
        setEmail(res.data.email || "");
      } catch (error) {
        toast.error("Lỗi tải thông tin");
      }
    };
    fetchProfile();
  }, [form]);

  // 2. Xử lý Submit
  const onSubmit = async (data: ProfileFormValues) => {
    setLoading(true);
    try {
      await api.put("/api/users/profile", data);
      toast.success("Cập nhật thông tin thành công!");
    } catch (error) {
      toast.error("Lỗi cập nhật");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header activeNav="none" />

      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
            <Link 
                href="/" 
                className="inline-flex items-center text-slate-500 hover:text-violet-600 transition-colors font-medium"
            >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Quay lại trang chủ
            </Link>
        </div>

        <div className="max-w-2xl mx-auto">
            {/* Title */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 mb-2">Thông tin tài khoản</h1>
                <p className="text-slate-500">Quản lý thông tin cá nhân của bạn</p>
            </div>

            <div className="bg-white shadow-lg rounded-2xl p-6 md:p-8 border border-slate-100">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    
                    {/* Avatar Section */}
                    <div className="flex flex-col items-center justify-center mb-8">
                        <div className="relative group">
                            <Avatar className="w-32 h-32 border-4 border-violet-100 shadow-xl">
                                <AvatarImage src={form.watch("avatarUrl")} className="object-cover" />
                                <AvatarFallback className="text-2xl bg-violet-50 text-violet-600">
                                    {form.watch("fullName")?.charAt(0)?.toUpperCase() || "U"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="absolute bottom-0 right-0">
                                <ImageUpload
                                    currentImageUrl={form.watch("avatarUrl")}
                                    imageType="profile"
                                    onUploadSuccess={(res) => {
                                        form.setValue("avatarUrl", res.url);
                                    }}
                                />
                            </div>
                        </div>
                        <p className="text-sm text-slate-400 mt-4">Nhấn vào biểu tượng máy ảnh để thay đổi ảnh đại diện</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Email (Read-only) */}
                        <div className="md:col-span-2 space-y-2">
                            <Label className="text-slate-700">Email đăng nhập</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input 
                                    disabled 
                                    value={email} 
                                    className="pl-10 bg-slate-50 border-slate-200 text-slate-500 font-medium" 
                                />
                            </div>
                            <p className="text-xs text-slate-400">Không thể thay đổi email đăng nhập.</p>
                        </div>

                        {/* Full Name */}
                        <div className="space-y-2">
                            <Label className="text-slate-700">Họ và tên</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input 
                                    {...form.register("fullName")} 
                                    placeholder="Nhập họ tên" 
                                    className="pl-10 border-slate-200 focus:ring-violet-500"
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <Label className="text-slate-700">Số điện thoại</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input 
                                    {...form.register("phoneNumber")} 
                                    placeholder="09xxxx..." 
                                    className="pl-10 border-slate-200 focus:ring-violet-500"
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div className="md:col-span-2 space-y-2">
                            <Label className="text-slate-700">Địa chỉ</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input 
                                    {...form.register("address")} 
                                    placeholder="Địa chỉ nhận vé..." 
                                    className="pl-10 border-slate-200 focus:ring-violet-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex items-center gap-4">
                        <Button 
                            type="button" 
                            variant="outline"
                            className="flex-1 h-12 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                            asChild
                        >
                            <Link href="/">Hủy bỏ</Link>
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={loading}
                            className="flex-1 h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-lg shadow-violet-200"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Đang lưu...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Lưu thay đổi
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
      </main>
    </div>
  );
}
