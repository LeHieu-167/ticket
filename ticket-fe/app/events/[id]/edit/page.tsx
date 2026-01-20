"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { 
  Ticket, LayoutDashboard, PlusCircle, QrCode, LogOut,
  Upload, Image as ImageIcon, Calendar, DollarSign,
  FileText, AlertCircle, ChevronLeft, Loader2, Package, Save,
  ToggleLeft, ToggleRight, CheckCircle, Clock, XCircle, Ban, ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import eventService, { EventRequest, EventResponse } from "@/apis/event.service";
import { useToast } from "@/hooks/use-toast";
import { EventStatus } from "@/types/enums";

// --- COMPONENTS ---

// Sidebar Navigation
const Sidebar = () => {
  const router = useRouter();
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/organizer/dashboard' },
    { icon: Calendar, label: 'Sự kiện của tôi', href: '/organizer/events' },
    { icon: PlusCircle, label: 'Tạo sự kiện', href: '/organizer/create-event' },
    { icon: Package, label: 'Quản lý đơn hàng', href: '/organizer/orders' },
    { icon: QrCode, label: 'Check-in', href: '/organizer/checkin' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userData');
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-slate-900 min-h-screen fixed left-0 top-0 z-40 hidden lg:block">
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
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-400 hover:bg-slate-800 hover:text-white`}
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

// File Upload Component
interface FileUploadProps {
  label: string;
  accept: string;
  icon: React.ReactNode;
  fileName?: string;
  onFileSelect: (file: File) => void;
  helperText?: string;
  previewUrl?: string;
}

const FileUpload = ({ label, accept, icon, fileName, onFileSelect, helperText, previewUrl }: FileUploadProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-violet-400 transition-all relative overflow-hidden">
        {previewUrl && !fileName ? (
          <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-50 hover:opacity-40 transition-opacity" />
        ) : null}
        
        <div className="flex flex-col items-center justify-center pt-5 pb-6 absolute inset-0 z-10">
          {icon}
          {fileName ? (
            <p className="mt-2 text-sm text-violet-600 font-medium">{fileName}</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-slate-500 bg-white/80 px-2 py-1 rounded">
                <span className="font-semibold text-violet-600">Click để tải lên</span> hoặc kéo thả
              </p>
              {helperText && <p className="text-xs text-slate-400 mt-1 bg-white/80 px-2 rounded">{helperText}</p>}
            </>
          )}
        </div>
        <input type="file" className="hidden" accept={accept} onChange={handleChange} />
      </label>
    </div>
  );
};

// --- MAIN PAGE ---
export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const toast = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Event status states
  const [eventStatus, setEventStatus] = useState<EventStatus>(EventStatus.DRAFT);
  const [isActive, setIsActive] = useState(true);
  
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
    ticketTypes: []
  });

  // File states
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  // Check auth and fetch event
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push(`/login?redirect=/events/${eventId}/edit`);
      return;
    }

    const fetchEvent = async () => {
      try {
        setIsLoading(true);
        const data = await eventService.getEventById(eventId);
        
        // Populate status states
        setEventStatus(data.status);
        setIsActive(data.isActive);
        
        // Populate form data
        setFormData({
          name: data.name,
          description: data.description || "",
          location: data.location,
          address: data.address || "",
          eventDate: data.eventDate,
          eventEndDate: data.eventEndDate || "",
          ticketPrice: data.ticketPrice,
          availableTickets: data.availableTickets,
          organizerName: data.organizerName || "",
          bannerImageUrl: data.bannerImageUrl || "",
          thumbnailUrl: data.thumbnailUrl || "",
          termsAndConditions: data.termsAndConditions || "",
          ticketTypes: [] 
        });

      } catch (err: any) {
        console.error("Error fetching event:", err);
        setSubmitError("Không thể tải thông tin sự kiện.");
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId) {
      fetchEvent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  // Helper to format ISO date to datetime-local input format (YYYY-MM-DDThh:mm)
  const formatDateTimeForInput = (isoString?: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    // Adjust to local time string format
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // Toggle sales status (ACTIVE <-> STOP_SELLING)
  const handleToggleSales = async () => {
    // Cho phép toggle giữa ACTIVE và STOP_SELLING
    if (eventStatus !== EventStatus.ACTIVE && eventStatus !== EventStatus.STOP_SELLING) {
      toast.error("Chỉ có thể thay đổi trạng thái bán vé khi sự kiện đang hoạt động!");
      return;
    }

    setIsTogglingStatus(true);
    try {
      const shouldBeActive = eventStatus === EventStatus.STOP_SELLING; // Nếu đang ngừng bán -> mở lại
      const updatedEvent = await eventService.toggleEventSales(eventId, shouldBeActive);
      setEventStatus(updatedEvent.status);
      setIsActive(updatedEvent.isActive);
      
      if (updatedEvent.status === EventStatus.ACTIVE) {
        toast.success("Sự kiện đã được mở bán vé!");
      } else {
        toast.success("Sự kiện đã tạm ngừng bán vé!");
      }
    } catch (error: any) {
      console.error("Error toggling sales:", error);
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi thay đổi trạng thái!");
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Get status display info
  const getStatusInfo = (status: EventStatus) => {
    switch (status) {
      case EventStatus.DRAFT:
        return { label: "Bản nháp", color: "bg-slate-100 text-slate-700", icon: FileText };
      case EventStatus.PENDING_APPROVAL:
        return { label: "Chờ duyệt", color: "bg-yellow-100 text-yellow-700", icon: Clock };
      case EventStatus.ACTIVE:
        return { label: "Đang bán", color: "bg-green-100 text-green-700", icon: CheckCircle };
      case EventStatus.STOP_SELLING:
        return { label: "Ngừng bán", color: "bg-orange-100 text-orange-700", icon: Ban };
      case EventStatus.REJECTED:
        return { label: "Bị từ chối", color: "bg-red-100 text-red-700", icon: XCircle };
      case EventStatus.CANCELLED:
        return { label: "Đã hủy", color: "bg-gray-100 text-gray-700", icon: Ban };
      case EventStatus.COMPLETED:
        return { label: "Đã kết thúc", color: "bg-blue-100 text-blue-700", icon: CheckCircle };
      case EventStatus.DELETED:
        return { label: "Đã xóa", color: "bg-gray-50 text-gray-400", icon: XCircle };
      default:
        return { label: "Không xác định", color: "bg-slate-100 text-slate-600", icon: AlertCircle };
    }
  };

  const statusInfo = getStatusInfo(eventStatus);
  const StatusIcon = statusInfo.icon;
  // Không cho sửa form nếu sự kiện đang ACTIVE, STOP_SELLING, CANCELLED, COMPLETED hoặc DELETED
  const canEditForm = ![
    EventStatus.ACTIVE, 
    EventStatus.STOP_SELLING,
    EventStatus.CANCELLED, 
    EventStatus.COMPLETED,
    EventStatus.DELETED
  ].includes(eventStatus);
  // Cho phép toggle bán vé nếu sự kiện đang ACTIVE hoặc STOP_SELLING
  const canToggleSales = eventStatus === EventStatus.ACTIVE || eventStatus === EventStatus.STOP_SELLING;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      // Validate
      if (!formData.name || !formData.location || !formData.eventDate) {
        throw new Error("Vui lòng điền đầy đủ thông tin bắt buộc");
      }

      const eventData: EventRequest = {
        ...formData,
        // Ensure ticketPrice and availableTickets are consistent 
        // if using ticketTypes logic, but for update we might just use the simple fields
      };

      console.log("Updating event data:", eventData);
      
      // Call API to update event
      await eventService.updateEvent(eventId, eventData);
      
      toast.success('Cập nhật sự kiện thành công!');
      
      // Redirect to event detail or organizer events
      setTimeout(() => {
        router.push(`/organizer/events`);
      }, 1500);

    } catch (error: any) {
      console.error("Lỗi cập nhật sự kiện:", error);
      setSubmitError(error.message || "Có lỗi xảy ra");
      toast.error(error.message || "Có lỗi xảy ra khi cập nhật sự kiện");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      <main className="lg:ml-64 p-4 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/organizer/events">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Chỉnh sửa sự kiện</h1>
            <p className="text-slate-500">Cập nhật thông tin sự kiện</p>
          </div>
        </div>

        {submitError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <p className="text-red-800">{submitError}</p>
          </div>
        )}

        {/* Event Status & Sales Toggle Card */}
        <Card className="border-0 shadow-xl rounded-2xl mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-4 text-white">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Trạng thái sự kiện
            </h3>
          </div>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Current Status */}
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Trạng thái duyệt</p>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${statusInfo.color}`}>
                    <StatusIcon className="w-4 h-4" />
                    {statusInfo.label}
                  </span>
                </div>
                
                {/* Hiển thị trạng thái bán vé cho ACTIVE và STOP_SELLING */}
                {canToggleSales && (
                  <div className="border-l pl-4 ml-4">
                    <p className="text-sm text-slate-500 mb-1">Trạng thái bán vé</p>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
                      eventStatus === EventStatus.ACTIVE 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {eventStatus === EventStatus.ACTIVE ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Đang mở bán
                        </>
                      ) : (
                        <>
                          <Ban className="w-4 h-4" />
                          Ngừng bán
                        </>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Toggle Sales Button - For ACTIVE and STOP_SELLING events */}
              {canToggleSales && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleToggleSales}
                    disabled={isTogglingStatus}
                    className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
                      eventStatus === EventStatus.ACTIVE 
                        ? 'bg-emerald-500 hover:bg-emerald-600' 
                        : 'bg-slate-300 hover:bg-slate-400'
                    } ${isTogglingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`absolute left-1 inline-flex h-10 w-10 transform items-center justify-center rounded-full bg-white shadow-lg transition-transform duration-300 ${
                        eventStatus === EventStatus.ACTIVE ? 'translate-x-12' : 'translate-x-0'
                      }`}
                    >
                      {isTogglingStatus ? (
                        <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
                      ) : eventStatus === EventStatus.ACTIVE ? (
                        <ToggleRight className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-slate-600" />
                      )}
                    </span>
                  </button>
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {eventStatus === EventStatus.ACTIVE ? 'Đang mở bán' : 'Đã ngừng bán'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {eventStatus === EventStatus.ACTIVE 
                        ? 'Click để tạm ngừng bán vé' 
                        : 'Click để mở lại bán vé'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Info message based on status */}
            {canEditForm && (
              <div className="mt-4 p-3 bg-blue-50 rounded-xl">
                <p className="text-sm text-blue-700">
                  <strong>Lưu ý:</strong> Bạn có thể chỉnh sửa thông tin sự kiện. Sau khi lưu, sự kiện sẽ chuyển về trạng thái "Bản nháp" và cần gửi duyệt lại.
                </p>
              </div>
            )}

            {(eventStatus === EventStatus.ACTIVE || eventStatus === EventStatus.STOP_SELLING) && (
              <div className="mt-4 p-3 bg-amber-50 rounded-xl">
                <p className="text-sm text-amber-700">
                  <strong>Lưu ý:</strong> Sự kiện đang hoạt động, không thể sửa thông tin. Bạn chỉ có thể bật/tắt trạng thái bán vé.
                </p>
              </div>
            )}

            {eventStatus === EventStatus.CANCELLED && (
              <div className="mt-4 p-3 bg-red-50 rounded-xl">
                <p className="text-sm text-red-700">
                  <strong>Lưu ý:</strong> Sự kiện đã bị hủy và không thể chỉnh sửa.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

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
                  disabled={!canEditForm}
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
                  disabled={!canEditForm}
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
                    className="mt-1 w-full h-10 px-3 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    required
                    disabled={!canEditForm}
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
                    disabled={!canEditForm}
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
                  disabled={!canEditForm}
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
                    value={formatDateTimeForInput(formData.eventDate)}
                    onChange={(e) => setFormData(prev => ({...prev, eventDate: new Date(e.target.value).toISOString()}))}
                    className="mt-1"
                    required
                    disabled={!canEditForm}
                  />
                </div>
                <div>
                  <Label htmlFor="eventEndDate">Ngày giờ kết thúc</Label>
                  <Input
                    id="eventEndDate"
                    name="eventEndDate"
                    type="datetime-local"
                    value={formatDateTimeForInput(formData.eventEndDate)}
                    onChange={(e) => setFormData(prev => ({...prev, eventEndDate: e.target.value ? new Date(e.target.value).toISOString() : undefined}))}
                    className="mt-1"
                    disabled={!canEditForm}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

           {/* Price & Quantity - Simplified for Edit if Ticket Types not supported nicely */}
           <Card className="border-0 shadow-lg rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-violet-600" />
                Giá vé & Số lượng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ticketPrice">Giá vé (VNĐ)</Label>
                    <Input
                      id="ticketPrice"
                      name="ticketPrice"
                      type="number"
                      value={formData.ticketPrice}
                      onChange={handleInputChange}
                      className="mt-1"
                      disabled={!canEditForm}
                    />
                  </div>
                   <div>
                    <Label htmlFor="availableTickets">Số lượng vé mở bán</Label>
                    <Input
                      id="availableTickets"
                      name="availableTickets"
                      type="number"
                      value={formData.availableTickets}
                      onChange={handleInputChange}
                      className="mt-1"
                      disabled={!canEditForm}
                    />
                  </div>
               </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card className="border-0 shadow-lg rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-violet-600" />
                Hình ảnh
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FileUpload
                  label="Ảnh banner (1200x600)"
                  accept="image/*"
                  icon={<Upload className="w-8 h-8 text-slate-400" />}
                  fileName={bannerFile?.name}
                  onFileSelect={setBannerFile}
                  helperText="PNG, JPG tối đa 5MB"
                  previewUrl={formData.bannerImageUrl}
                />
                <FileUpload
                  label="Ảnh thumbnail (600x400)"
                  accept="image/*"
                  icon={<Upload className="w-8 h-8 text-slate-400" />}
                  fileName={thumbnailFile?.name}
                  onFileSelect={setThumbnailFile}
                  helperText="PNG, JPG tối đa 5MB"
                  previewUrl={formData.thumbnailUrl}
                />
              </div>
              {canEditForm && (
                <>
                  <p className="text-xs text-slate-500 mt-2 italic">* Lưu ý: Hiện tại chức năng upload ảnh đang trong quá trình nâng cấp, vui lòng giữ nguyên ảnh cũ hoặc cung cấp URL ảnh.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                      <Label htmlFor="bannerImageUrl">URL Banner</Label>
                      <Input
                        id="bannerImageUrl"
                        name="bannerImageUrl"
                        value={formData.bannerImageUrl || ''}
                        onChange={handleInputChange}
                        className="mt-1"
                        disabled={!canEditForm}
                      />
                    </div>
                    <div>
                      <Label htmlFor="thumbnailUrl">URL Thumbnail</Label>
                      <Input
                        id="thumbnailUrl"
                        name="thumbnailUrl"
                        value={formData.thumbnailUrl || ''}
                        onChange={handleInputChange}
                        className="mt-1"
                        disabled={!canEditForm}
                      />
                    </div>
                  </div>
                </>
              )}
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
                disabled={!canEditForm}
              />
            </CardContent>
          </Card>

          {/* Submit - Only show if can edit */}
          {canEditForm && (
            <div className="flex justify-end gap-4">
              <Link href="/organizer/events">
                <Button type="button" variant="outline" className="rounded-xl">
                  Hủy
                </Button>
              </Link>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-violet-600 hover:bg-violet-700 rounded-xl px-8"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang cập nhật...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Lưu thay đổi
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Back button for non-editable events */}
          {!canEditForm && (
            <div className="flex justify-center">
              <Link href="/organizer/events">
                <Button variant="outline" className="rounded-xl px-8">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Quay lại danh sách sự kiện
                </Button>
              </Link>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}

