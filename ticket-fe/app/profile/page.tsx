"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/config/axios.config"; // Instance axios của bạn
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ImageUpload } from "@/components/ui/image-upload";
import { useToast } from "@/hooks/use-toast";

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
      // Có thể reload lại trang hoặc cập nhật context user nếu cần
    } catch (error) {
      toast.error("Lỗi cập nhật");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white shadow rounded-lg mt-10">
      <h1 className="text-2xl font-bold mb-6">Thông tin tài khoản</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        
        {/* Avatar Section */}
        <div className="flex items-center gap-4 mb-4">
            <Avatar className="w-20 h-20">
                <AvatarImage src={form.watch("avatarUrl")} />
                <AvatarFallback>U</AvatarFallback>
            </Avatar>
            {/* Component Upload ảnh (Cloudinary) */}
            <ImageUpload
              currentImageUrl={form.watch("avatarUrl")}
              imageType="profile"
              onUploadSuccess={(res) => {
                form.setValue("avatarUrl", res.url);
              }}
            />
        </div>

        {/* Full Name */}
        <div>
          <Label>Họ và tên</Label>
          <Input {...form.register("fullName")} placeholder="Nhập họ tên" />
        </div>

        {/* Phone */}
        <div>
          <Label>Số điện thoại</Label>
          <Input {...form.register("phoneNumber")} placeholder="09xxxx..." />
        </div>

        {/* Address */}
        <div>
          <Label>Địa chỉ</Label>
          <Input {...form.register("address")} placeholder="Địa chỉ nhận vé..." />
        </div>

        {/* Email (Read-only - Không cho sửa) */}
        <div>
           <Label>Email</Label>
           <Input disabled value={email} className="bg-gray-100" />
           <p className="text-xs text-muted-foreground mt-1">Không thể thay đổi email đăng nhập.</p>
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </form>
    </div>
  );
}