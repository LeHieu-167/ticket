"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Ticket, LayoutDashboard, Calendar, Users, Settings, LogOut,
  Search, Filter, MoreHorizontal, UserCheck, UserX, Mail,
  Phone, Shield, Building2, User, ChevronLeft, ChevronRight,
  Eye, Ban, CheckCircle, Loader2, Trash2, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import adminService, { UserResponse } from "@/apis/admin.service";
import { useToast } from "@/hooks/use-toast";

// --- COMPONENTS ---

// Admin Sidebar
const AdminSidebar = () => {
  const router = useRouter();
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
    { icon: Calendar, label: 'Duyệt sự kiện', href: '/admin/events' },
    { icon: Users, label: 'Người dùng', href: '/admin/users', active: true },
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

// Role Badge
const RoleBadge = ({ roles }: { roles: string[] }) => {
  // Determine primary role to display
  const primaryRole = roles.includes('ROLE_ADMIN') 
    ? 'ADMIN' 
    : roles.includes('ROLE_ORGANIZER') 
      ? 'ORGANIZER' 
      : 'CUSTOMER';

  const config = {
    CUSTOMER: { label: 'Khách hàng', bg: 'bg-blue-100', text: 'text-blue-700', icon: User },
    ORGANIZER: { label: 'Nhà tổ chức', bg: 'bg-purple-100', text: 'text-purple-700', icon: Building2 },
    ADMIN: { label: 'Admin', bg: 'bg-red-100', text: 'text-red-700', icon: Shield },
  }[primaryRole] || { label: primaryRole, bg: 'bg-slate-100', text: 'text-slate-700', icon: User };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

// Status Badge
const StatusBadge = ({ isActive }: { isActive: boolean }) => {
  const config = isActive 
    ? { label: 'Hoạt động', bg: 'bg-emerald-100', text: 'text-emerald-700' }
    : { label: 'Không hoạt động', bg: 'bg-slate-100', text: 'text-slate-600' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

// Format date
const formatDate = (isoString?: string) => {
  if (!isoString) return "N/A";
  return new Date(isoString).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// --- MAIN PAGE ---

export default function AdminUsersPage() {
  const router = useRouter();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  
  // State cho các thao tác block/unblock/delete
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<UserResponse | null>(null);

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

    // Fetch users from API
    const fetchUsers = async () => {
      try {
        const data = await adminService.getAllUsers();
        setUsers(data);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Không thể tải danh sách người dùng");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Xử lý chặn tài khoản
  const handleBlockUser = async (userId: string) => {
    try {
      setActionLoading(userId);
      const updatedUser = await adminService.blockUser(userId);
      setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
      toast.success("Đã chặn tài khoản thành công!");
    } catch (error: any) {
      const message = error.response?.data?.message || "Không thể chặn tài khoản";
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  // Xử lý mở chặn tài khoản
  const handleUnblockUser = async (userId: string) => {
    try {
      setActionLoading(userId);
      const updatedUser = await adminService.unblockUser(userId);
      setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
      toast.success("Đã mở chặn tài khoản thành công!");
    } catch (error: any) {
      const message = error.response?.data?.message || "Không thể mở chặn tài khoản";
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  // Xử lý xóa tài khoản
  const handleDeleteUser = async (userId: string) => {
    try {
      setActionLoading(userId);
      await adminService.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setDeleteConfirm(null);
      toast.success("Đã xóa tài khoản thành công!");
    } catch (error: any) {
      const message = error.response?.data?.message || "Không thể xóa tài khoản";
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  // Kiểm tra user có phải là Admin không
  const isAdminUser = (roles: string[]) => roles.includes('ROLE_ADMIN');

  // Helper function to get primary role from roles array
  const getPrimaryRole = (roles: string[]): string => {
    if (roles.includes('ROLE_ADMIN')) return 'ADMIN';
    if (roles.includes('ROLE_ORGANIZER')) return 'ORGANIZER';
    return 'CUSTOMER';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const primaryRole = getPrimaryRole(user.roles);
    const matchesRole = !filterRole || primaryRole === filterRole;
    const matchesStatus = !filterStatus || 
      (filterStatus === 'ACTIVE' && user.isActive) ||
      (filterStatus === 'INACTIVE' && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    customers: users.filter(u => u.roles.includes('ROLE_CUSTOMER')).length,
    organizers: users.filter(u => u.roles.includes('ROLE_ORGANIZER')).length,
  };

  if (isLoading) {
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
          <h1 className="text-3xl font-bold text-slate-900">Quản lý người dùng</h1>
          <p className="text-slate-500 mt-1">Xem và quản lý tài khoản người dùng</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-sm text-slate-500">Tổng người dùng</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <UserCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
                <p className="text-sm text-slate-500">Đang hoạt động</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.customers}</p>
                <p className="text-sm text-slate-500">Khách hàng</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.organizers}</p>
                <p className="text-sm text-slate-500">Nhà tổ chức</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-lg mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Tìm kiếm theo tên, email, username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 bg-slate-50 border-slate-200"
                  />
                </div>
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="h-11 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              >
                <option value="">Tất cả vai trò</option>
                <option value="CUSTOMER">Khách hàng</option>
                <option value="ORGANIZER">Nhà tổ chức</option>
                <option value="ADMIN">Admin</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-11 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Không hoạt động</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-0">
            {filteredUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Người dùng</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Liên hệ</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Vai trò</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Trạng thái</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Ngày tạo</th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {user.fullName?.charAt(0) || user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{user.fullName || user.username}</p>
                              <p className="text-sm text-slate-500">@{user.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-sm text-slate-700 flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              {user.email}
                            </p>
                            {user.phoneNumber && (
                              <p className="text-sm text-slate-500 flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                {user.phoneNumber}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <RoleBadge roles={user.roles} />
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge isActive={user.isActive} />
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {/* Không hiển thị nút thao tác cho Admin */}
                            {!isAdminUser(user.roles) && (
                              <>
                                {actionLoading === user.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                ) : (
                                  <>
                                    {user.isActive ? (
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                        onClick={() => handleBlockUser(user.id)}
                                        title="Chặn tài khoản"
                                      >
                                        <Ban className="w-4 h-4" />
                                      </Button>
                                    ) : (
                                      <>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                          onClick={() => handleUnblockUser(user.id)}
                                          title="Mở chặn tài khoản"
                                        >
                                          <CheckCircle className="w-4 h-4" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => setDeleteConfirm(user)}
                                          title="Xóa tài khoản"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </>
                                    )}
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-2">Không tìm thấy người dùng</h3>
                <p className="text-slate-500">
                  {searchQuery || filterRole || filterStatus 
                    ? 'Không có người dùng phù hợp với bộ lọc' 
                    : 'Chưa có người dùng nào trong hệ thống'}
                </p>
              </div>
            )}

            {/* Pagination */}
            {filteredUsers.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
                <p className="text-sm text-slate-500">
                  Hiển thị {filteredUsers.length} / {users.length} người dùng
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="bg-red-600 text-white border-red-600">
                    1
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Xác nhận xóa tài khoản</h3>
                <p className="text-sm text-slate-500">Hành động này không thể hoàn tác</p>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {deleteConfirm.fullName?.charAt(0) || deleteConfirm.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{deleteConfirm.fullName || deleteConfirm.username}</p>
                  <p className="text-sm text-slate-500">{deleteConfirm.email}</p>
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-6">
              Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản <strong>{deleteConfirm.username}</strong>? 
              Tất cả dữ liệu liên quan sẽ bị xóa và không thể khôi phục.
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteConfirm(null)}
                disabled={actionLoading === deleteConfirm.id}
              >
                Hủy
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => handleDeleteUser(deleteConfirm.id)}
                disabled={actionLoading === deleteConfirm.id}
              >
                {actionLoading === deleteConfirm.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Xóa tài khoản
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
