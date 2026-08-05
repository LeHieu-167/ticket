"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Ticket, LayoutDashboard, PlusCircle, QrCode, LogOut,
  TrendingUp, Users, Calendar, DollarSign, Activity,
  ChevronRight, Eye, MoreHorizontal, Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import eventService, { EventResponse } from "@/apis/event.service";

// --- UTILS ---

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatDate = (isoString: string) => {
  if (!isoString) return "N/A";
  const date = new Date(isoString);
  return date.toLocaleDateString('vi-VN', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric'
  });
};

// --- COMPONENTS ---

// Sidebar Navigation
const Sidebar = () => {
  const router = useRouter();
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/organizer/dashboard', active: true },
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
    <aside className="w-64 bg-slate-900 min-h-screen fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <Link href="/" className="flex items-center gap-2">
          <Ticket className="h-8 w-8 text-violet-400" />
          <div>
            <span className="text-xl font-bold text-white">TicketHub</span>
            <p className="text-xs text-slate-400">Organizer Portal</p>
          </div>
        </Link>
      </div>

      {/* Menu */}
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

      {/* Logout */}
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

// Animated Counter Component - Số nhảy realtime
interface AnimatedCounterProps {
  value: number;
  duration?: number;
}

const AnimatedCounter = ({ value, duration = 2000 }: AnimatedCounterProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(0);

  useEffect(() => {
    startValueRef.current = displayValue;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const currentValue = Math.floor(
        startValueRef.current + (value - startValueRef.current) * easeOutQuart
      );
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span className="tabular-nums">
      {displayValue.toLocaleString('vi-VN')}
    </span>
  );
};

// Live Indicator
const LiveIndicator = () => (
  <div className="flex items-center gap-2">
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
    </span>
    <span className="text-xs font-medium text-green-600">LIVE</span>
  </div>
);

// Stat Card with Real-time Animation
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: number;
  prefix?: string;
  suffix?: string;
  isLive?: boolean;
  color: string;
}

const StatCard = ({ title, value, icon, trend, prefix = '', suffix = '', isLive, color }: StatCardProps) => (
  <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            {isLive && <LiveIndicator />}
          </div>
          <p className={`text-4xl font-black ${color}`}>
            {prefix}<AnimatedCounter value={value} />{suffix}
          </p>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className={`w-4 h-4 ${trend < 0 ? 'rotate-180' : ''}`} />
              <span>{Math.abs(trend)}% so với hôm qua</span>
            </div>
          )}
        </div>
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color.includes('violet') ? 'from-violet-500 to-purple-600' : color.includes('green') ? 'from-green-500 to-emerald-600' : color.includes('blue') ? 'from-blue-500 to-cyan-600' : 'from-orange-500 to-amber-600'} flex items-center justify-center shadow-lg`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

// Event Row - Hiển thị chi tiết doanh thu và số vé từng loại
const EventRow = ({ event }: { event: EventResponse }) => {
  // Sử dụng trực tiếp dữ liệu từ backend
  const ticketStats = event.ticketTypes?.map(tt => ({
    name: tt.name,
    sold: tt.soldQuantity ?? 0,                    // Số vé đã bán từ backend
    total: tt.totalQuantity ?? 0,                  // Tổng số vé
    available: tt.availableQuantity ?? 0,          // Số vé còn lại từ backend
    revenue: tt.revenue ?? 0,                      // Doanh thu từ backend
    price: tt.price ?? 0
  })) || [];
  
  // Tính tổng từ ticketTypes
  const totalSoldFromTypes = ticketStats.reduce((sum, t) => sum + t.sold, 0);
  const totalRevenueFromTypes = ticketStats.reduce((sum, t) => sum + t.revenue, 0);
  const totalAvailableFromTypes = ticketStats.reduce((sum, t) => sum + t.available, 0);
  
  // Ưu tiên dùng dữ liệu tổng từ Event (backend đã tính), fallback về tổng từ ticketTypes
  const displaySold = event.ticketsSold ?? totalSoldFromTypes;
  const displayRevenue = event.totalRevenue ?? totalRevenueFromTypes;
  const displayAvailable = ticketStats.length > 0 ? totalAvailableFromTypes : event.availableTickets;

  return (
    <div className="p-4 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100 mb-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
            <img 
              src={event.thumbnailUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200'} 
              alt={event.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">{event.name}</h4>
            <p className="text-sm text-slate-500">{formatDate(event.eventDate)} • {event.location}</p>
          </div>
        </div>
        <Link href={`/events/${event.slug}`}>
          <Button variant="ghost" size="icon" className="rounded-xl">
            <Eye className="w-5 h-5" />
          </Button>
        </Link>
      </div>
      
      {/* Thống kê doanh thu và số vé */}
      <div className="bg-slate-50 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-slate-500">Đã bán</p>
              <p className="text-lg font-bold text-violet-600">{displaySold} vé</p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center">
              <p className="text-xs text-slate-500">Doanh thu</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(displayRevenue)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Còn lại</p>
            <p className="text-sm font-semibold text-slate-700">{displayAvailable} vé</p>
          </div>
        </div>
        
        {/* Chi tiết từng loại vé */}
        {ticketStats.length > 0 && (
          <div className="border-t border-slate-200 pt-2 mt-2 space-y-1">
            <p className="text-xs font-medium text-slate-500 mb-1">Chi tiết theo loại vé:</p>
            {ticketStats.map((ticket, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="text-slate-600">{ticket.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">
                    {ticket.sold}/{ticket.total} vé
                  </span>
                  <span className="font-medium text-green-600 min-w-[90px] text-right">
                    {formatCurrency(ticket.revenue)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
export default function OrganizerDashboard() {
  const router = useRouter();
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Realtime stats - simulated WebSocket
  const [ticketsSold, setTicketsSold] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [activeEvents, setActiveEvents] = useState(0);

  // Check auth
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login?redirect=/organizer/dashboard');
    }
  }, [router]);

  // Fetch events and stats
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsData, statsData] = await Promise.all([
          eventService.getMyEvents(),
          eventService.getOrganizerStats()
        ]);
        
        setEvents(eventsData);
        
        // Update stats from backend
        setTicketsSold(statsData.ticketsSold);
        setTotalRevenue(statsData.totalRevenue);
        setTotalCustomers(statsData.totalCustomers);
        setActiveEvents(statsData.activeEvents);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Fallback or empty state
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Dashboard</h1>
            <p className="text-slate-500">Xin chào! Đây là tổng quan hoạt động của bạn.</p>
          </div>
          <Link href="/organizer/create-event">
            <Button className="bg-violet-600 hover:bg-violet-700 rounded-xl">
              <PlusCircle className="w-5 h-5 mr-2" />
              Tạo sự kiện mới
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Số vé đã bán"
            value={ticketsSold}
            icon={<Ticket className="w-7 h-7 text-white" />}
            color="text-violet-600"
          />
          <StatCard
            title="Doanh thu"
            value={totalRevenue >= 1000000 ? Math.floor(totalRevenue / 1000000) : Math.floor(totalRevenue / 1000)}
            prefix=""
            suffix={totalRevenue >= 1000000 ? "M" : "K"}
            icon={<DollarSign className="w-7 h-7 text-white" />}
            color="text-green-600"
          />
          <StatCard
            title="Khách hàng"
            value={totalCustomers}
            icon={<Users className="w-7 h-7 text-white" />}
            color="text-blue-600"
          />
          <StatCard
            title="Sự kiện đang diễn ra"
            value={activeEvents}
            icon={<Calendar className="w-7 h-7 text-white" />}
            color="text-orange-600"
          />
        </div>

        {/* Activity Summary */}
        <Card className="mb-8 border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6" />
                <h2 className="text-xl font-bold">Tổng quan hoạt động</h2>
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
              <div className="text-center">
                <div className="text-5xl font-black text-violet-600 mb-2">
                  <AnimatedCounter value={ticketsSold} />
                </div>
                <p className="text-lg text-slate-500">vé đã bán</p>
              </div>
              <div className="text-center">
                <div className="text-5xl font-black text-green-600 mb-2">
                  {formatCurrency(totalRevenue)}
                </div>
                <p className="text-lg text-slate-500">tổng doanh thu</p>
              </div>
            </div>
            <div className="mt-4 text-center text-sm text-slate-400">
              Dữ liệu được cập nhật từ hệ thống
            </div>
          </CardContent>
        </Card>

        {/* Events List */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold">Sự kiện của bạn</CardTitle>
            <Link href="/organizer/events">
              <Button variant="ghost" className="text-violet-600">
                Xem tất cả
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">
                Đang tải...
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-2">
                {events.slice(0, 5).map(event => (
                  <EventRow key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-2">Chưa có sự kiện nào</h3>
                <p className="text-slate-500 mb-4">Tạo sự kiện đầu tiên của bạn ngay!</p>
                <Link href="/organizer/create-event">
                  <Button className="bg-violet-600 hover:bg-violet-700">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Tạo sự kiện
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

