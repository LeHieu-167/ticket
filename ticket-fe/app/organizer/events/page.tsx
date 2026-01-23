"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Ticket, LayoutDashboard, PlusCircle, QrCode, LogOut, Package,
  Calendar, MapPin, Edit, Trash2, Eye, MoreHorizontal, Loader2,
  AlertCircle, Search, Filter, ChevronLeft, ChevronRight, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import eventService, { EventResponse } from "@/apis/event.service";
import { EventStatus, EventStatusDisplay } from "@/types/enums";
import { useToast } from "@/hooks/use-toast";

// --- UTILS ---

const formatDate = (isoString: string) => {
  if (!isoString) return "N/A";
  const date = new Date(isoString);
  return date.toLocaleDateString('vi-VN', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// --- COMPONENTS ---

// Sidebar Navigation
const Sidebar = () => {
  const router = useRouter();
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/organizer/dashboard' },
    { icon: Calendar, label: 'Sự kiện của tôi', href: '/organizer/events', active: true },
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

// Status Badge Component
const StatusBadge = ({ status }: { status: EventStatus }) => {
  const displayInfo = EventStatusDisplay[status] || EventStatusDisplay[EventStatus.DRAFT];
  
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${displayInfo.bgColor} ${displayInfo.color}`}>
      {displayInfo.label}
    </span>
  );
};

// Event Table Row
interface EventRowProps {
  event: EventResponse;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}

const EventRow = ({ event, onEdit, onDelete, onView }: EventRowProps) => (
  <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
    <td className="py-4 px-4">
      <div className="flex items-center gap-3">
        <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0">
          {event.thumbnailUrl ? (
            <img src={event.thumbnailUrl} alt={event.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-slate-300" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-900 truncate max-w-[200px]">{event.name}</p>
          <p className="text-sm text-slate-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {event.location}
          </p>
        </div>
      </div>
    </td>
    <td className="py-4 px-4">
      <p className="text-sm text-slate-900">{formatDate(event.eventDate)}</p>
    </td>
    <td className="py-4 px-4">
      <p className="text-sm font-medium text-slate-900">{formatCurrency(event.ticketPrice)}</p>
      <p className="text-xs text-slate-500">{event.availableTickets} vé còn</p>
    </td>
    <td className="py-4 px-4">
      <StatusBadge status={event.status} />
      {event.status === EventStatus.REJECTED && event.rejectionReason && (
        <p className="text-xs text-red-500 mt-1 max-w-[150px] truncate" title={event.rejectionReason}>
          Lý do: {event.rejectionReason}
        </p>
      )}
    </td>
    <td className="py-4 px-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onView} className="h-8 w-8">
          <Eye className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
          <Edit className="w-4 h-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Xóa sự kiện
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </td>
  </tr>
);

// Delete Confirmation Dialog
interface DeleteDialogProps {
  event: EventResponse;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

const DeleteDialog = ({ event, onConfirm, onCancel, isDeleting }: DeleteDialogProps) => {
  // Kiểm tra nếu sự kiện ACTIVE và đang bán vé
  const isActiveAndSelling = event.status === EventStatus.ACTIVE && event.isActive;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Xác nhận xóa</h3>
          <p className="text-slate-500 mb-4">
            Bạn có chắc muốn xóa sự kiện <span className="font-medium text-slate-900">"{event.name}"</span>? 
            Hành động này không thể hoàn tác.
          </p>
          
          {/* Cảnh báo nếu sự kiện đang bán vé */}
          {isActiveAndSelling && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-left">
              <p className="text-sm text-amber-700">
                <strong>⚠️ Lưu ý:</strong> Sự kiện này đang mở bán vé. Bạn cần <strong>ngừng bán vé</strong> trước khi có thể xóa sự kiện.
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Vào trang chỉnh sửa → Tắt trạng thái bán vé → Sau đó mới xóa được.
              </p>
            </div>
          )}
          
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isDeleting}>
              Hủy
            </Button>
            <Button 
              variant="destructive" 
              className="flex-1" 
              onClick={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                'Xóa'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Success Popup Component
interface SuccessPopupProps {
  onClose: () => void;
}

const SuccessPopup = ({ onClose }: SuccessPopupProps) => {
  useEffect(() => {
    // Tự động đóng sau 5 giây
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Tạo sự kiện thành công!</h3>
          <p className="text-slate-600 mb-2">
            Sự kiện của bạn đã được gửi đi và đang chờ Admin duyệt.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Bạn sẽ nhận được thông báo khi sự kiện được duyệt hoặc cần chỉnh sửa.
          </p>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 rounded-xl" 
              onClick={onClose}
            >
              Đóng
            </Button>
            <Link href="/organizer/create-event" className="flex-1">
              <Button className="w-full bg-violet-600 hover:bg-violet-700 rounded-xl">
                <PlusCircle className="w-4 h-4 mr-2" />
                Tạo sự kiện mới
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
export default function OrganizerEventsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | EventStatus>('all');
  const [deleteEvent, setDeleteEvent] = useState<EventResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // Check auth
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login?redirect=/organizer/events');
    }
  }, [router]);

  // Kiểm tra query param để hiển thị popup thành công
  useEffect(() => {
    if (searchParams.get('created') === 'true') {
      setShowSuccessPopup(true);
      // Xóa query param khỏi URL để không hiện lại khi refresh
      router.replace('/organizer/events', { scroll: false });
    }
  }, [searchParams, router]);

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await eventService.getMyEvents();
        setEvents(data);
      } catch (error) {
        console.error('Error fetching events:', error);
        
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Filter events
  const filteredEvents = events.filter(event => {
    const matchesSearch = !searchQuery || 
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async () => {
    if (!deleteEvent) return;
    
    setIsDeleting(true);
    try {
      await eventService.deleteEvent(deleteEvent.id);
      setEvents(events.filter(e => e.id !== deleteEvent.id));
      toast.success('Đã xóa sự kiện thành công!');
      setDeleteEvent(null);
    } catch (error: any) {
      console.error('Error deleting event:', error);
      // Lấy message lỗi từ backend response
      const errorMessage = error.response?.data?.message || error.message || 'Không thể xóa sự kiện';
      toast.error(errorMessage);
      setDeleteEvent(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Stats
  const stats = {
    total: events.length,
    active: events.filter(e => e.status === EventStatus.ACTIVE).length,
    pending: events.filter(e => e.status === EventStatus.PENDING_APPROVAL).length,
    rejected: events.filter(e => e.status === EventStatus.REJECTED).length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Sự kiện của tôi</h1>
            <p className="text-slate-500">Quản lý tất cả sự kiện bạn đã tạo</p>
          </div>
          <Link href="/organizer/create-event">
            <Button className="bg-violet-600 hover:bg-violet-700 rounded-xl">
              <PlusCircle className="w-5 h-5 mr-2" />
              Tạo sự kiện mới
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Tổng sự kiện</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Đang bán</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Chờ duyệt</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Bị từ chối</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-lg rounded-2xl mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm sự kiện..."
                  className="pl-12 h-11 rounded-xl"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('all')}
                  className="rounded-xl"
                >
                  Tất cả
                </Button>
                <Button
                  variant={statusFilter === EventStatus.ACTIVE ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(EventStatus.ACTIVE)}
                  className="rounded-xl"
                >
                  Đang bán
                </Button>
                <Button
                  variant={statusFilter === EventStatus.PENDING_APPROVAL ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(EventStatus.PENDING_APPROVAL)}
                  className="rounded-xl"
                >
                  Chờ duyệt
                </Button>
                <Button
                  variant={statusFilter === EventStatus.REJECTED ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(EventStatus.REJECTED)}
                  className="rounded-xl"
                >
                  Từ chối
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events Table */}
        <Card className="border-0 shadow-lg rounded-2xl">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
              </div>
            ) : filteredEvents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-slate-600">Sự kiện</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-slate-600">Thời gian</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-slate-600">Giá vé</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-slate-600">Trạng thái</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-slate-600">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((event) => (
                      <EventRow
                        key={event.id}
                        event={event}
                        onView={() => router.push(`/events/${event.slug}`)}
                        onEdit={() => router.push(`/events/${event.slug}/edit`)}
                        onDelete={() => setDeleteEvent(event)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16">
                <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-2">Không có sự kiện</h3>
                <p className="text-slate-500 mb-4">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Không tìm thấy sự kiện phù hợp' 
                    : 'Bạn chưa tạo sự kiện nào'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <Link href="/organizer/create-event">
                    <Button className="bg-violet-600 hover:bg-violet-700">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Tạo sự kiện đầu tiên
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Delete Dialog */}
      {deleteEvent && (
        <DeleteDialog
          event={deleteEvent}
          onConfirm={handleDelete}
          onCancel={() => setDeleteEvent(null)}
          isDeleting={isDeleting}
        />
      )}

      {/* Success Popup khi tạo sự kiện thành công */}
      {showSuccessPopup && (
        <SuccessPopup onClose={() => setShowSuccessPopup(false)} />
      )}
    </div>
  );
}

