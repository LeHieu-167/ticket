"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Ticket, LayoutDashboard, Calendar, Users, Settings, LogOut,
  TrendingUp, DollarSign, UserCheck, CalendarCheck, Activity,
  ArrowUpRight, ArrowDownRight, Clock, AlertTriangle, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import adminService, { AdminDashboardStats } from "@/apis/admin.service";
import { EventResponse } from "@/apis/event.service";

// --- COMPONENTS ---

// Admin Sidebar
const AdminSidebar = () => {
  const router = useRouter();
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard', active: true },
    { icon: Calendar, label: 'Duyệt sự kiện', href: '/admin/events' },
    { icon: Users, label: 'Người dùng', href: '/admin/users' },
    { icon: Settings, label: 'Cài đặt', href: '/admin/settings' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.push('/admin/login');
  };

  return (
    <aside className="w-64 bg-slate-900 min-h-screen fixed left-0 top-0 z-40">
      <div className="p-6 border-b border-slate-800">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
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

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color: 'red' | 'green' | 'blue' | 'orange';
  isLoading?: boolean;
}

const StatCard = ({ title, value, change, icon: Icon, color, isLoading }: StatCardProps) => {
  const colors = {
    red: 'bg-red-500',
    green: 'bg-emerald-500',
    blue: 'bg-blue-500',
    orange: 'bg-orange-500'
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            {isLoading ? (
              <div className="h-9 flex items-center mt-2">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
            )}
            {change !== undefined && !isLoading && (
              <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                <span>{Math.abs(change)}% so với tháng trước</span>
              </div>
            )}
          </div>
          <div className={`${colors[color]} p-3 rounded-xl`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Format currency
const formatCurrency = (amount: number) => {
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1)} tỷ`;
  }
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)} triệu`;
  }
  return new Intl.NumberFormat('vi-VN').format(amount);
};

// Format number with separator
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('vi-VN').format(num);
};

// --- MAIN PAGE ---

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [pendingEvents, setPendingEvents] = useState<EventResponse[]>([]);

  useEffect(() => {
    // Check admin auth
    const checkAuth = () => {
      const token = localStorage.getItem('accessToken');
      const userStr = localStorage.getItem('user');
      
      if (!token || !userStr) {
        router.push('/admin/login');
        return false;
      }

      try {
        const user = JSON.parse(userStr);
        if (!user.roles?.includes('ROLE_ADMIN')) {
          router.push('/admin/login');
          return false;
        }
        return true;
      } catch {
        router.push('/admin/login');
        return false;
      }
    };

    if (!checkAuth()) return;

    // Fetch dashboard data
    const fetchData = async () => {
      try {
        const [statsData, eventsData] = await Promise.all([
          adminService.getDashboardStats(),
          adminService.getRecentPendingEvents(3),
        ]);
        setStats(statsData);
        setPendingEvents(eventsData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (isLoading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminSidebar />

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Tổng quan hệ thống TicketHub</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Tổng sự kiện"
            value={stats ? formatNumber(stats.totalEvents) : 0}
            icon={Calendar}
            color="blue"
            isLoading={isLoading}
          />
          <StatCard
            title="Người dùng"
            value={stats ? formatNumber(stats.totalUsers) : 0}
            icon={Users}
            color="green"
            isLoading={isLoading}
          />
          <StatCard
            title="Doanh thu ước tính"
            value={stats ? formatCurrency(stats.totalRevenue) : '0'}
            icon={DollarSign}
            color="orange"
            isLoading={isLoading}
          />
          <StatCard
            title="Vé đã bán"
            value={stats ? formatNumber(stats.totalTicketsSold) : 0}
            icon={Ticket}
            color="red"
            isLoading={isLoading}
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Events */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  Sự kiện chờ duyệt
                </span>
                {stats && stats.pendingEventsCount > 0 && (
                  <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">
                    {stats.pendingEventsCount}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : pendingEvents.length > 0 ? (
                <div className="space-y-4">
                  {pendingEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div>
                        <p className="font-semibold text-slate-900 line-clamp-1">{event.name}</p>
                        <p className="text-sm text-slate-500">Đăng bởi: {event.organizerName || 'N/A'}</p>
                      </div>
                      <Link 
                        href="/admin/events"
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Xem →
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarCheck className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                  <p className="text-slate-500">Không có sự kiện chờ duyệt</p>
                </div>
              )}
              <Link 
                href="/admin/events"
                className="block mt-4 text-center text-sm font-medium text-red-600 hover:text-red-700"
              >
                Xem tất cả sự kiện chờ duyệt
              </Link>
            </CardContent>
          </Card>

          {/* User Stats */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="w-5 h-5 text-blue-500" />
                Phân bố người dùng
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="font-medium text-slate-700">Khách hàng</span>
                    </div>
                    <span className="text-xl font-bold text-blue-600">
                      {stats ? formatNumber(stats.customersCount) : 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <UserCheck className="w-5 h-5 text-purple-600" />
                      </div>
                      <span className="font-medium text-slate-700">Nhà tổ chức</span>
                    </div>
                    <span className="text-xl font-bold text-purple-600">
                      {stats ? formatNumber(stats.organizersCount) : 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-emerald-600" />
                      </div>
                      <span className="font-medium text-slate-700">Sự kiện đang hoạt động</span>
                    </div>
                    <span className="text-xl font-bold text-emerald-600">
                      {stats ? formatNumber(stats.activeEventsCount) : 0}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Status */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Trạng thái hệ thống
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'API Server', status: 'Hoạt động', ok: true },
                  { name: 'Database', status: 'Hoạt động', ok: true },
                  { name: 'Payment Gateway', status: 'Hoạt động', ok: true },
                  { name: 'Email Service', status: 'Hoạt động', ok: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700">{item.name}</span>
                    <span className={`flex items-center gap-2 text-sm font-medium ${item.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                      <span className={`w-2 h-2 rounded-full ${item.ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Thao tác nhanh
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Link 
                  href="/admin/events"
                  className="p-4 bg-red-50 hover:bg-red-100 rounded-xl text-center transition-colors"
                >
                  <Calendar className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="font-medium text-red-700">Duyệt sự kiện</p>
                  {stats && stats.pendingEventsCount > 0 && (
                    <p className="text-xs text-red-500 mt-1">{stats.pendingEventsCount} chờ duyệt</p>
                  )}
                </Link>
                <Link 
                  href="/admin/users"
                  className="p-4 bg-blue-50 hover:bg-blue-100 rounded-xl text-center transition-colors"
                >
                  <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="font-medium text-blue-700">Quản lý user</p>
                  {stats && (
                    <p className="text-xs text-blue-500 mt-1">{formatNumber(stats.totalUsers)} người dùng</p>
                  )}
                </Link>
                <Link 
                  href="/admin/settings"
                  className="p-4 bg-slate-100 hover:bg-slate-200 rounded-xl text-center transition-colors"
                >
                  <Settings className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="font-medium text-slate-700">Cài đặt</p>
                </Link>
                <Link 
                  href="/"
                  className="p-4 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-center transition-colors"
                >
                  <Ticket className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="font-medium text-emerald-700">Xem trang chủ</p>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
