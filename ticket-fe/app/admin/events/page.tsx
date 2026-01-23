"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Ticket, LayoutDashboard, Calendar, Users, Settings, LogOut,
  CheckCircle, XCircle, Eye, Search, Filter, Loader2, AlertCircle,
  Clock, MapPin, User, Building2, ChevronLeft, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// Admin Sidebar
const AdminSidebar = () => {
  const router = useRouter();
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
    { icon: Calendar, label: 'Duyệt sự kiện', href: '/admin/events', active: true },
    { icon: Users, label: 'Người dùng', href: '/admin/users' },
    { icon: Settings, label: 'Cài đặt', href: '/admin/settings' },
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
          <Ticket className="h-8 w-8 text-red-400" />
          <div>
            <span className="text-xl font-bold text-white">TicketHub</span>
            <p className="text-xs text-red-400">Admin Panel</p>
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
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' 
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

// Event Card for Admin
interface EventCardProps {
  event: EventResponse;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
  onView: () => void;
  isProcessing: boolean;
}

const EventCard = ({ event, onApprove, onReject, onCancel, onView, isProcessing }: EventCardProps) => (
  <Card className="border-0 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-shadow">
    <div className="flex">
      {/* Thumbnail */}
      <div className="w-48 h-full bg-slate-100 shrink-0">
        {event.thumbnailUrl ? (
          <img src={event.thumbnailUrl} alt={event.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center min-h-[160px]">
            <Calendar className="w-12 h-12 text-slate-300" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{event.name}</h3>
            <StatusBadge status={event.status} />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onView}
            disabled={event.status === EventStatus.DELETED}
            className={event.status === EventStatus.DELETED ? "opacity-50" : ""}
          >
            <Eye className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>{formatDate(event.eventDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span>{event.organizerName || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Ticket className="w-4 h-4 text-slate-400" />
            <span>{formatCurrency(event.ticketPrice)}</span>
          </div>
        </div>

        {event.description && (
          <p className="text-sm text-slate-500 line-clamp-2 mb-4">{event.description}</p>
        )}

        {/* Actions - Only show for PENDING */}
        {event.status === EventStatus.PENDING_APPROVAL && (
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
            <Button 
              onClick={onApprove}
              disabled={isProcessing}
              className="flex-1 bg-green-600 hover:bg-green-700 rounded-xl"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Duyệt
            </Button>
            <Button 
              onClick={onReject}
              disabled={isProcessing}
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Từ chối
            </Button>
          </div>
        )}

        {/* Actions - Show Cancel for ACTIVE events */}
        {event.status === EventStatus.ACTIVE && (
           <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
             <Button
               onClick={onCancel}
               disabled={isProcessing}
               variant="outline"
               className="w-full border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
             >
               <LogOut className="w-4 h-4 mr-2" />
               Hủy sự kiện
             </Button>
           </div>
        )}

        {/* Show rejection reason if rejected */}
        {event.status === EventStatus.REJECTED && event.rejectionReason && (
          <div className="mt-3 p-3 bg-red-50 rounded-xl">
            <p className="text-sm text-red-700">
              <strong>Lý do từ chối:</strong> {event.rejectionReason}
            </p>
          </div>
        )}
      </div>
    </div>
  </Card>
);

// Reject Dialog
interface RejectDialogProps {
  event: EventResponse;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

const RejectDialog = ({ event, onConfirm, onCancel, isProcessing }: RejectDialogProps) => {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Từ chối sự kiện</h3>
          <p className="text-slate-500">
            Bạn đang từ chối sự kiện <span className="font-medium text-slate-900">"{event.name}"</span>
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Lý do từ chối <span className="text-red-500">*</span>
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nhập lý do từ chối để organizer biết cần sửa gì..."
            rows={4}
            className="w-full"
          />
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1 rounded-xl" 
            onClick={onCancel}
            disabled={isProcessing}
          >
            Hủy
          </Button>
          <Button 
            variant="destructive" 
            className="flex-1 rounded-xl" 
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim() || isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Xác nhận từ chối
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
export default function AdminEventsPage() {
  const router = useRouter();
  const toast = useToast();
  
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectEvent, setRejectEvent] = useState<EventResponse | null>(null);
  const [cancelEvent, setCancelEvent] = useState<EventResponse | null>(null);

  // Check auth
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login?redirect=/admin/events');
    }
    // In real app, also check if user is ADMIN role
  }, [router]);

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      try {
        let data: EventResponse[];
        if (activeTab === 'pending') {
          data = await eventService.adminGetPendingEvents();
        } else {
          data = await eventService.adminGetAllEvents();
        }
        setEvents(data);
      } catch (error) {
        console.error('Error fetching events:', error);
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [activeTab]);

  // Filter events by search
  const filteredEvents = events.filter(event => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      event.name.toLowerCase().includes(query) ||
      event.location.toLowerCase().includes(query) ||
      event.organizerName?.toLowerCase().includes(query)
    );
  });

  const handleApprove = async (event: EventResponse) => {
    setProcessingId(event.id);
    try {
      await eventService.adminApproveEvent(event.id);
      
      // Update local state
      setEvents(prev => prev.map(e => 
        e.id === event.id ? { ...e, status: EventStatus.ACTIVE, isActive: true } : e
      ));
      
      toast.success(`Đã duyệt sự kiện "${event.name}" thành công!`);
    } catch (error: any) {
      console.error('Error approving event:', error);
      toast.error(error.response?.data?.message || "Lỗi khi duyệt sự kiện");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectEvent) return;
    
    setProcessingId(rejectEvent.id);
    try {
      await eventService.adminRejectEvent(rejectEvent.id, reason);
      
      // Update local state
      setEvents(prev => prev.map(e => 
        e.id === rejectEvent.id ? { ...e, status: EventStatus.REJECTED, rejectionReason: reason } : e
      ));
      
      toast.success(`Đã từ chối sự kiện "${rejectEvent.name}"`);
    } catch (error: any) {
      console.error('Error rejecting event:', error);
      toast.error(error.response?.data?.message || "Lỗi khi từ chối sự kiện");
    } finally {
      setProcessingId(null);
      setRejectEvent(null);
    }
  };

  const handleCancel = async (reason: string) => {
    if (!cancelEvent) return;

    setProcessingId(cancelEvent.id);
    try {
      await eventService.adminCancelEvent(cancelEvent.id, reason);

      setEvents(prev => prev.map(e =>
        e.id === cancelEvent.id ? { ...e, status: EventStatus.CANCELLED } : e
      ));

      toast.success(`Đã hủy sự kiện "${cancelEvent.name}"`);
    } catch (error) {
      console.error('Error cancelling event:', error);
      toast.error("Lỗi khi hủy sự kiện");
    } finally {
      setProcessingId(null);
      setCancelEvent(null);
    }
  };

  // Stats
  const pendingCount = activeTab === 'pending' 
    ? events.length 
    : events.filter(e => e.status === EventStatus.PENDING_APPROVAL).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar />

      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Duyệt sự kiện</h1>
            <p className="text-slate-500">Xem xét và phê duyệt các sự kiện mới</p>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-xl">
              <Clock className="w-5 h-5" />
              <span className="font-bold">{pendingCount} sự kiện chờ duyệt</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'pending' ? 'default' : 'outline'}
            onClick={() => setActiveTab('pending')}
            className={`rounded-xl ${activeTab === 'pending' ? 'bg-red-600 hover:bg-red-700' : ''}`}
          >
            <Clock className="w-4 h-4 mr-2" />
            Chờ duyệt
            {pendingCount > 0 && activeTab !== 'pending' && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </Button>
          <Button
            variant={activeTab === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveTab('all')}
            className={`rounded-xl ${activeTab === 'all' ? 'bg-red-600 hover:bg-red-700' : ''}`}
          >
            Tất cả
          </Button>
        </div>

        {/* Search */}
        <Card className="border-0 shadow-lg rounded-2xl mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo tên sự kiện, địa điểm, organizer..."
                className="pl-12 h-11 rounded-xl"
              />
            </div>
          </CardContent>
        </Card>

        {/* Events List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onApprove={() => handleApprove(event)}
                onReject={() => setRejectEvent(event)}
                onCancel={() => setCancelEvent(event)}
                onView={() => router.push(`/events/${event.slug}`)}
                isProcessing={processingId === event.id}
              />
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-lg rounded-2xl">
            <CardContent className="p-16 text-center">
              {activeTab === 'pending' ? (
                <>
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Không có sự kiện chờ duyệt</h3>
                  <p className="text-slate-500">Tất cả sự kiện đã được xử lý</p>
                </>
              ) : (
                <>
                  <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Không có sự kiện</h3>
                  <p className="text-slate-500">
                    {searchQuery ? 'Không tìm thấy sự kiện phù hợp' : 'Chưa có sự kiện nào trong hệ thống'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Reject Dialog */}
      {rejectEvent && (
        <RejectDialog
          event={rejectEvent}
          onConfirm={handleReject}
          onCancel={() => setRejectEvent(null)}
          isProcessing={processingId === rejectEvent.id}
        />
      )}

      {/* Cancel Dialog */}
      {cancelEvent && (
        <RejectDialog
          event={cancelEvent}
          onConfirm={handleCancel}
          onCancel={() => setCancelEvent(null)}
          isProcessing={processingId === cancelEvent.id}
        />
      )}
    </div>
  );
}

