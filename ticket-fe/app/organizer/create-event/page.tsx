"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Ticket, LayoutDashboard, PlusCircle, QrCode, LogOut,
  Upload, Image as ImageIcon, FileJson, MapPin, Calendar, DollarSign,
  Users, FileText, CheckCircle, AlertCircle, ChevronLeft, Loader2, Package,
  Plus, Trash2, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import eventService, { EventRequest } from "@/apis/event.service";
import fileService from "@/apis/file.service";
import { useToast } from "@/hooks/use-toast";

// --- COMPONENTS ---

// Sidebar Navigation
const Sidebar = () => {
  const router = useRouter();
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/organizer/dashboard' },
    { icon: Calendar, label: 'Sự kiện của tôi', href: '/organizer/events' },
    { icon: PlusCircle, label: 'Tạo sự kiện', href: '/organizer/create-event', active: true },
    { icon: Package, label: 'Quản lý đơn hàng', href: '/organizer/orders' },
    { icon: QrCode, label: 'Check-in', href: '/organizer/checkin' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userData');
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-slate-900 min-h-screen fixed left-0 top-0 z-40">
      <div className="p-6 border-b border-slate-800">
        <Link href="/" className="flex items-center gap-2">
          <Ticket className="h-8 w-8 text-violet-400" />
          <div>
            <span className="text-xl font-bold text-white">TicketHub</span>
            <p className="text-xs text-slate-400">Organizer Portal</p>
          </div>
        </Link>
      </div>

      <nav className="p-4 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all
              ${item.active 
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all w-full"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};

// Image Upload Component with Preview and Progress
interface ImageUploadProps {
  label: string;
  imageUrl?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  error?: string;
  onFileSelect: (file: File) => void;
  onRemove?: () => void;
  helperText?: string;
}

const ImageUploadBox = ({ 
  label, 
  imageUrl, 
  isUploading, 
  uploadProgress = 0, 
  error,
  onFileSelect, 
  onRemove,
  helperText 
}: ImageUploadProps) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file
      const validation = fileService.validateFile(file, 5);
      if (!validation.isValid) {
        alert(validation.error);
        return;
      }
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    if (!isUploading && !imageUrl) {
      inputRef.current?.click();
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      
      {/* Show preview if image uploaded */}
      {imageUrl ? (
        <div className="relative w-full h-40 rounded-2xl overflow-hidden border-2 border-violet-300 bg-slate-100">
          <img 
            src={imageUrl} 
            alt={label}
            className="w-full h-full object-cover"
          />
          {/* Remove button */}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {/* Success indicator */}
          <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Đã tải lên
          </div>
        </div>
      ) : (
        <label 
          onClick={handleClick}
          className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-all
            ${isUploading 
              ? 'border-violet-400 bg-violet-50' 
              : error 
                ? 'border-red-300 bg-red-50'
                : 'border-slate-300 hover:bg-slate-50 hover:border-violet-400'
            }`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
                <p className="mt-2 text-sm text-violet-600 font-medium">
                  Đang tải lên... {uploadProgress}%
                </p>
                {/* Progress bar */}
                <div className="w-32 h-2 bg-violet-200 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full bg-violet-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </>
            ) : error ? (
              <>
                <AlertCircle className="w-8 h-8 text-red-500" />
                <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>
                <p className="text-xs text-red-400 mt-1">Click để thử lại</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-400" />
                <p className="mt-2 text-sm text-slate-500">
                  <span className="font-semibold text-violet-600">Click để tải lên</span> hoặc kéo thả
                </p>
                {helperText && <p className="text-xs text-slate-400 mt-1">{helperText}</p>}
              </>
            )}
          </div>
          <input 
            ref={inputRef}
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={handleChange}
            disabled={isUploading}
          />
        </label>
      )}
    </div>
  );
};

// Legacy File Upload Component (for seat map JSON)
interface FileUploadProps {
  label: string;
  accept: string;
  icon: React.ReactNode;
  fileName?: string;
  onFileSelect: (file: File) => void;
  helperText?: string;
}

const FileUpload = ({ label, accept, icon, fileName, onFileSelect, helperText }: FileUploadProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-violet-400 transition-all">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {icon}
          {fileName ? (
            <p className="mt-2 text-sm text-violet-600 font-medium">{fileName}</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-slate-500">
                <span className="font-semibold text-violet-600">Click để tải lên</span> hoặc kéo thả
              </p>
              {helperText && <p className="text-xs text-slate-400 mt-1">{helperText}</p>}
            </>
          )}
        </div>
        <input type="file" className="hidden" accept={accept} onChange={handleChange} />
      </label>
    </div>
  );
};

// Hard-coded seat map JSON example
/*
const SAMPLE_SEAT_MAP_JSON = {
  venue: "Nhà hát Lớn Hà Nội",
  rows: [
    { row: "A", seats: 10, category: "VIP", price: 2000000 },
    { row: "B", seats: 10, category: "VIP", price: 2000000 },
    { row: "C", seats: 14, category: "Premium", price: 1500000 },
    { row: "D", seats: 14, category: "Premium", price: 1500000 },
    { row: "E", seats: 16, category: "Standard", price: 800000 },
    { row: "F", seats: 16, category: "Standard", price: 800000 },
    ]
};
*/

// --- MAIN PAGE ---
export default function CreateEventPage() {
  const router = useRouter();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState<EventRequest & { 
    seatMapImageUrl?: string;
    seatMapJson?: string;
    ticketTypes?: Array<{ name: string; price: number; totalQuantity: number }>;
  }>({
    name: "",
    description: "",
    location: "",
    address: "",
    eventDate: "",
    eventEndDate: "",
    ticketPrice: 0,
    availableTickets: 0,
    organizerName: "",
    bannerImageUrl: "",
    thumbnailUrl: "",
    termsAndConditions: "",
    ticketTypes: [
      { name: "", price: 0, totalQuantity: 0 },
    ]
  });

  // State cho validation lỗi loại vé
  const [ticketTypeErrors, setTicketTypeErrors] = useState<string | null>(null);

  // Image upload states
  const [bannerUrl, setBannerUrl] = useState<string>("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [mapImageUrl, setMapImageUrl] = useState<string>("");
  const [bannerUploading, setBannerUploading] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [mapImageUploading, setMapImageUploading] = useState(false);
  const [bannerProgress, setBannerProgress] = useState(0);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);
  const [mapImageProgress, setMapImageProgress] = useState(0);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [mapImageError, setMapImageError] = useState<string | null>(null);

  // Seat map states
  const [seatMapImage, setSeatMapImage] = useState<File | null>(null);
  const [seatMapJson, setSeatMapJson] = useState<File | null>(null);
  const [hasSeatMap, setHasSeatMap] = useState(false);

  // Check auth
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login?redirect=/organizer/create-event');
    }
  }, [router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleTicketTypeChange = (index: number, field: string, value: string | number) => {
    setFormData(prev => {
      const newTicketTypes = [...(prev.ticketTypes || [])];
      newTicketTypes[index] = { ...newTicketTypes[index], [field]: value };
      return { ...prev, ticketTypes: newTicketTypes };
    });
    // Xóa lỗi khi user bắt đầu nhập
    setTicketTypeErrors(null);
  };

  // Thêm loại vé mới
  const handleAddTicketType = () => {
    setFormData(prev => ({
      ...prev,
      ticketTypes: [
        ...(prev.ticketTypes || []),
        { name: "", price: 0, totalQuantity: 0 }
      ]
    }));
  };

  // Xóa loại vé
  const handleRemoveTicketType = (index: number) => {
    setFormData(prev => {
      const newTicketTypes = [...(prev.ticketTypes || [])];
      newTicketTypes.splice(index, 1);
      return { ...prev, ticketTypes: newTicketTypes };
    });
  };

  // Validate loại vé
  const validateTicketTypes = (): boolean => {
    const ticketTypes = formData.ticketTypes || [];
    
    if (ticketTypes.length === 0) {
      setTicketTypeErrors("Vui lòng thêm ít nhất một loại vé");
      return false;
    }

    for (let i = 0; i < ticketTypes.length; i++) {
      const ticket = ticketTypes[i];
      if (!ticket.name || ticket.name.trim() === "") {
        setTicketTypeErrors(`Loại vé ${i + 1}: Vui lòng nhập tên loại vé`);
        return false;
      }
      if (!ticket.price || ticket.price <= 0) {
        setTicketTypeErrors(`Loại vé "${ticket.name || i + 1}": Vui lòng nhập giá vé hợp lệ (> 0)`);
        return false;
      }
      if (!ticket.totalQuantity || ticket.totalQuantity <= 0) {
        setTicketTypeErrors(`Loại vé "${ticket.name || i + 1}": Vui lòng nhập số lượng vé hợp lệ (> 0)`);
        return false;
      }
    }

    setTicketTypeErrors(null);
    return true;
  };

  // Handle banner image upload
  const handleBannerUpload = async (file: File) => {
    setBannerError(null);
    setBannerUploading(true);
    setBannerProgress(0);
    
    try {
      const response = await fileService.uploadFile(file, 'banner', (progress) => {
        setBannerProgress(progress);
      });
      
      setBannerUrl(response.url);
      toast.success('Tải ảnh banner thành công!');
    } catch (error: any) {
      console.error('Error uploading banner:', error);
      setBannerError('Lỗi tải ảnh. Vui lòng thử lại.');
      toast.error('Không thể tải ảnh banner');
    } finally {
      setBannerUploading(false);
    }
  };

  // Handle thumbnail image upload
  const handleThumbnailUpload = async (file: File) => {
    setThumbnailError(null);
    setThumbnailUploading(true);
    setThumbnailProgress(0);
    
    try {
      const response = await fileService.uploadFile(file, 'thumbnail', (progress) => {
        setThumbnailProgress(progress);
      });
      
      setThumbnailUrl(response.url);
      toast.success('Tải ảnh thumbnail thành công!');
    } catch (error: any) {
      console.error('Error uploading thumbnail:', error);
      setThumbnailError('Lỗi tải ảnh. Vui lòng thử lại.');
      toast.error('Không thể tải ảnh thumbnail');
    } finally {
      setThumbnailUploading(false);
    }
  };

  // Handle remove banner
  const handleRemoveBanner = async () => {
    if (bannerUrl) {
      try {
        await fileService.deleteFileByUrl(bannerUrl);
      } catch (error) {
        console.error('Error deleting banner:', error);
      }
    }
    setBannerUrl("");
    setBannerError(null);
  };

  // Handle remove thumbnail
  const handleRemoveThumbnail = async () => {
    if (thumbnailUrl) {
      try {
        await fileService.deleteFileByUrl(thumbnailUrl);
      } catch (error) {
        console.error('Error deleting thumbnail:', error);
      }
    }
    setThumbnailUrl("");
    setThumbnailError(null);
  };

  // Handle map image upload
  const handleMapImageUpload = async (file: File) => {
    setMapImageError(null);
    setMapImageUploading(true);
    setMapImageProgress(0);
    
    try {
      const response = await fileService.uploadFile(file, 'map', (progress) => {
        setMapImageProgress(progress);
      });
      
      setMapImageUrl(response.url);
      toast.success('Tải ảnh sơ đồ thành công!');
    } catch (error: any) {
      console.error('Error uploading map image:', error);
      setMapImageError('Lỗi tải ảnh. Vui lòng thử lại.');
      toast.error('Không thể tải ảnh sơ đồ');
    } finally {
      setMapImageUploading(false);
    }
  };

  // Handle remove map image
  const handleRemoveMapImage = async () => {
    if (mapImageUrl) {
      try {
        await fileService.deleteFileByUrl(mapImageUrl);
      } catch (error) {
        console.error('Error deleting map image:', error);
      }
    }
    setMapImageUrl("");
    setMapImageError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);
    setIsSubmitting(true);

    try {
      // Validate
      if (!formData.name || !formData.location || !formData.eventDate) {
        throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc");
      }

      // Validate loại vé
      if (!validateTicketTypes()) {
        setIsSubmitting(false);
        return;
      }

      // Calculate total tickets from ticket types
      const totalTickets = formData.ticketTypes?.reduce((sum, t) => sum + t.totalQuantity, 0) || 0;
      const minPrice = Math.min(...(formData.ticketTypes?.map(t => t.price) || [0]));

      // Build event data with uploaded image URLs
      const eventData: EventRequest = {
        ...formData,
        ticketPrice: minPrice,
        availableTickets: totalTickets,
        bannerImageUrl: bannerUrl || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        mapImageUrl: mapImageUrl || undefined,
      };

      console.log("Event data:", eventData);
      
      // Debug: Log token trước khi gọi API
      const token = localStorage.getItem("accessToken");
      console.log("Token exists:", !!token);
      console.log("Banner URL:", bannerUrl);
      console.log("Thumbnail URL:", thumbnailUrl);

      // Call API to create event (ticket types đã được xử lý trong backend)
      // Backend sẽ tự động tạo ticket types từ eventData.ticketTypes
      try {
        const response = await eventService.createEvent(eventData);
        console.log("Created event with ID:", response.id);
        console.log("Event created with ticket types included in request");

      } catch (apiError: any) {
        console.error("Error creating event:", apiError);
        console.error("Error response:", apiError.response?.data);
        console.error("Error status:", apiError.response?.status);
        
        // Nếu lỗi 400 - thông tin sự kiện không chính xác
        if (apiError.response?.status === 400) {
          throw new Error("Thông tin sự kiện không chính xác, vui lòng thử lại.");
        }
        
        // Nếu lỗi 401 - thông tin sự kiện không chính xác hoặc phiên hết hạn
        if (apiError.response?.status === 401) {
          throw new Error("Thông tin sự kiện không chính xác, vui lòng thử lại.");
        }
        
        // Nếu lỗi 403 - không có quyền
        if (apiError.response?.status === 403) {
          throw new Error("Bạn không có quyền tạo sự kiện. Vui lòng đăng nhập với tài khoản Nhà tổ chức (Organizer).");
        }
        
        throw apiError;
      }
      
      setSubmitSuccess(true);
      
      // Show toast notification
      toast.success('Sự kiện đã được gửi đi phê duyệt. Vui lòng chờ!');
      
      // Redirect ngay lập tức đến trang danh sách sự kiện với query param để hiển thị popup
      router.push('/organizer/events?created=true');

    } catch (error: any) {
      console.error("Lỗi tạo sự kiện:", error);
      setSubmitError(error.message || "Có lỗi xảy ra");
      toast.error(error.message || "Có lỗi xảy ra khi tạo sự kiện");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/organizer/dashboard">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Tạo sự kiện mới</h1>
            <p className="text-slate-500">Điền thông tin để tạo sự kiện của bạn</p>
          </div>
        </div>

        {/* Success/Error Messages */}
        {submitSuccess && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-2xl flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-yellow-600" />
            <div>
              <p className="font-bold text-yellow-800">Sự kiện đã được gửi đi phê duyệt!</p>
              <p className="text-yellow-600 text-sm">Vui lòng chờ Admin duyệt. Đang chuyển trang...</p>
            </div>
          </div>
        )}

        {submitError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <p className="text-red-800">{submitError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-0 shadow-lg rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-600" />
                Thông tin cơ bản
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Tên sự kiện <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="VD: Concert Mỹ Tâm - Live in Hanoi"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Mô tả sự kiện</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Mô tả chi tiết về sự kiện..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              {/* Map Image Upload Section */}
              <div className="p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-5 h-5 text-violet-600" />
                  <h3 className="text-sm font-semibold text-slate-800">Sơ đồ địa điểm / Bản đồ</h3>
                </div>
                <p className="text-sm text-slate-500 mb-4">
                  Tải lên ảnh sơ đồ địa điểm tổ chức sự kiện.
                </p>
                <ImageUploadBox
                  label="Ảnh sơ đồ / Bản đồ"
                  imageUrl={mapImageUrl}
                  isUploading={mapImageUploading}
                  uploadProgress={mapImageProgress}
                  error={mapImageError || undefined}
                  onFileSelect={handleMapImageUpload}
                  onRemove={handleRemoveMapImage}
                  helperText="PNG, JPG tối đa 5MB - Khuyến nghị ảnh rõ ràng, có chú thích"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Thành phố <span className="text-red-500">*</span></Label>
                  <select
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="mt-1 w-full h-10 px-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    required
                  >
                    <option value="">Chọn thành phố</option>
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="TP.HCM">TP.HCM</option>
                    <option value="Đà Nẵng">Đà Nẵng</option>
                    <option value="Hải Phòng">Hải Phòng</option>
                    <option value="Cần Thơ">Cần Thơ</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="address">Địa chỉ chi tiết</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Số nhà, đường, quận/huyện..."
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="organizerName">Tên đơn vị tổ chức</Label>
                <Input
                  id="organizerName"
                  name="organizerName"
                  value={formData.organizerName}
                  onChange={handleInputChange}
                  placeholder="VD: Công ty TNHH Giải trí ABC"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Time */}
          <Card className="border-0 shadow-lg rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-violet-600" />
                Thời gian
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="eventDate">Ngày giờ bắt đầu <span className="text-red-500">*</span></Label>
                  <Input
                    id="eventDate"
                    name="eventDate"
                    type="datetime-local"
                    value={formData.eventDate}
                    onChange={handleInputChange}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="eventEndDate">Ngày giờ kết thúc</Label>
                  <Input
                    id="eventEndDate"
                    name="eventEndDate"
                    type="datetime-local"
                    value={formData.eventEndDate}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Types */}
          <Card className="border-0 shadow-lg rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-violet-600" />
                  Loại vé <span className="text-red-500">*</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTicketType}
                  className="rounded-xl border-violet-300 text-violet-600 hover:bg-violet-50"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Thêm loại vé
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Hiển thị lỗi validation loại vé */}
              {ticketTypeErrors && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-sm text-red-600">{ticketTypeErrors}</p>
                </div>
              )}

              {/* Hướng dẫn khi chưa có loại vé */}
              {(!formData.ticketTypes || formData.ticketTypes.length === 0) && (
                <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl text-center">
                  <DollarSign className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">Chưa có loại vé nào</p>
                  <p className="text-sm text-slate-400 mb-3">Bấm nút "Thêm loại vé" để thêm loại vé cho sự kiện</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddTicketType}
                    className="rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Thêm loại vé đầu tiên
                  </Button>
                </div>
              )}

              {formData.ticketTypes?.map((ticket, index) => (
                <div key={index} className="relative p-4 bg-slate-50 rounded-xl border border-slate-200">
                  {/* Header với số thứ tự và nút xóa */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-500">
                      Loại vé #{index + 1}
                    </span>
                    {(formData.ticketTypes?.length || 0) > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTicketType(index)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Form fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Tên loại vé <span className="text-red-500">*</span></Label>
                      <Input
                        value={ticket.name}
                        onChange={(e) => handleTicketTypeChange(index, 'name', e.target.value)}
                        placeholder="VD: VIP, Standard, Premium..."
                        className={`mt-1 ${!ticket.name && ticketTypeErrors ? 'border-red-300' : ''}`}
                      />
                    </div>
                    <div>
                      <Label>Giá (VNĐ) <span className="text-red-500">*</span></Label>
                      <Input
                        type="number"
                        value={ticket.price || ''}
                        onChange={(e) => handleTicketTypeChange(index, 'price', parseInt(e.target.value) || 0)}
                        placeholder="VD: 500000"
                        className={`mt-1 ${(!ticket.price || ticket.price <= 0) && ticketTypeErrors ? 'border-red-300' : ''}`}
                      />
                    </div>
                    <div>
                      <Label>Số lượng <span className="text-red-500">*</span></Label>
                      <Input
                        type="number"
                        value={ticket.totalQuantity || ''}
                        onChange={(e) => handleTicketTypeChange(index, 'totalQuantity', parseInt(e.target.value) || 0)}
                        placeholder="VD: 100"
                        className={`mt-1 ${(!ticket.totalQuantity || ticket.totalQuantity <= 0) && ticketTypeErrors ? 'border-red-300' : ''}`}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Tổng số vé */}
              {formData.ticketTypes && formData.ticketTypes.length > 0 && (
                <div className="p-4 bg-violet-50 rounded-xl border border-violet-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-violet-700">Tổng số vé:</span>
                    <span className="text-lg font-bold text-violet-700">
                      {formData.ticketTypes.reduce((sum, t) => sum + (t.totalQuantity || 0), 0).toLocaleString('vi-VN')} vé
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Images */}
          <Card className="border-0 shadow-lg rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-violet-600" />
                Hình ảnh sự kiện
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-500">
                Tải lên hình ảnh để sự kiện của bạn nổi bật hơn. Ảnh sẽ được lưu trữ trên đám mây.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ImageUploadBox
                  label="Ảnh banner (1200x600)"
                  imageUrl={bannerUrl}
                  isUploading={bannerUploading}
                  uploadProgress={bannerProgress}
                  error={bannerError || undefined}
                  onFileSelect={handleBannerUpload}
                  onRemove={handleRemoveBanner}
                  helperText="PNG, JPG tối đa 5MB"
                />
                <ImageUploadBox
                  label="Ảnh thumbnail (600x400)"
                  imageUrl={thumbnailUrl}
                  isUploading={thumbnailUploading}
                  uploadProgress={thumbnailProgress}
                  error={thumbnailError || undefined}
                  onFileSelect={handleThumbnailUpload}
                  onRemove={handleRemoveThumbnail}
                  helperText="PNG, JPG tối đa 5MB"
                />
              </div>
              
              {/* Tips */}
              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-sm font-medium text-blue-800 mb-2">💡 Gợi ý:</p>
                <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
                  <li><strong>Banner</strong>: Ảnh ngang, hiển thị ở đầu trang chi tiết sự kiện</li>
                  <li><strong>Thumbnail</strong>: Ảnh nhỏ, hiển thị trong danh sách sự kiện</li>
                  <li>Sử dụng ảnh chất lượng cao để thu hút người xem</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Terms */}
          <Card className="border-0 shadow-lg rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-600" />
                Điều khoản & Điều kiện
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="termsAndConditions"
                name="termsAndConditions"
                value={formData.termsAndConditions}
                onChange={handleInputChange}
                placeholder="Nhập các điều khoản và điều kiện của sự kiện..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link href="/organizer/dashboard">
              <Button type="button" variant="outline" className="rounded-xl">
                Hủy
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={isSubmitting || bannerUploading || thumbnailUploading || mapImageUploading}
              className="bg-violet-600 hover:bg-violet-700 rounded-xl px-8"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang tạo...
                </>
              ) : bannerUploading || thumbnailUploading || mapImageUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang tải ảnh...
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Tạo sự kiện
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

