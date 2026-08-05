"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Ticket, LayoutDashboard, Calendar, Users, Settings, LogOut,
  Save, Globe, CreditCard, Mail, Bell, Shield, Database,
  Palette, Lock, Server, Check, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// --- COMPONENTS ---

// Admin Sidebar
const AdminSidebar = () => {
  const router = useRouter();
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
    { icon: Calendar, label: 'Duyệt sự kiện', href: '/admin/events' },
    { icon: Users, label: 'Người dùng', href: '/admin/users' },
    { icon: Settings, label: 'Cài đặt', href: '/admin/settings', active: true },
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

// Settings Section Component
interface SettingsSectionProps {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}

const SettingsSection = ({ icon: Icon, title, description, children }: SettingsSectionProps) => (
  <Card className="border-0 shadow-lg">
    <CardHeader className="pb-4">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-slate-100 rounded-xl">
          <Icon className="w-6 h-6 text-slate-700" />
        </div>
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

// Toggle Switch Component
const ToggleSwitch = ({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label: string }) => (
  <div className="flex items-center justify-between py-3">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${enabled ? 'translate-x-7' : 'translate-x-1'}`} />
    </button>
  </div>
);

// --- MAIN PAGE ---

export default function AdminSettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    // General
    siteName: 'TicketHub',
    siteDescription: 'Nền tảng đặt vé sự kiện hàng đầu Việt Nam',
    supportEmail: 'support@tickethub.vn',
    supportPhone: '1900 1234',
    
    // Payment
    transactionFee: '5',
    minWithdrawal: '100000',
    paymentMethods: ['vnpay', 'momo', 'bank'],
    
    // Features
    enableRegistration: true,
    enableOrganizerSignup: true,
    requireEmailVerification: true,
    enableNotifications: true,
    maintenanceMode: false,
  });

  useEffect(() => {
    // Check admin auth
    const checkAuth = () => {
      const token = localStorage.getItem('accessToken');
      const userStr = localStorage.getItem('user');
      
      if (!token || !userStr) {
        router.push('/admin/login');
        return;
      }

      try {
        const user = JSON.parse(userStr);
        if (!user.roles?.includes('ROLE_ADMIN')) {
          router.push('/admin/login');
          return;
        }
      } catch {
        router.push('/admin/login');
        return;
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Cài đặt hệ thống</h1>
            <p className="text-slate-500 mt-1">Quản lý cấu hình và thiết lập hệ thống</p>
          </div>
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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

        {/* Success Toast */}
        {showSaveSuccess && (
          <div className="fixed top-8 right-8 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-right z-50">
            <Check className="w-5 h-5" />
            Đã lưu cài đặt thành công!
          </div>
        )}

        <div className="space-y-6">
          {/* General Settings */}
          <SettingsSection
            icon={Globe}
            title="Cài đặt chung"
            description="Thông tin cơ bản về website"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Tên website</Label>
                <Input
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  className="bg-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label>Email hỗ trợ</Label>
                <Input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  className="bg-slate-50"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Mô tả website</Label>
                <Textarea
                  value={settings.siteDescription}
                  onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                  className="bg-slate-50"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Hotline hỗ trợ</Label>
                <Input
                  value={settings.supportPhone}
                  onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                  className="bg-slate-50"
                />
              </div>
            </div>
          </SettingsSection>

          {/* Payment Settings */}
          <SettingsSection
            icon={CreditCard}
            title="Cài đặt thanh toán"
            description="Cấu hình phương thức và phí giao dịch"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Phí giao dịch (%)</Label>
                <Input
                  type="number"
                  value={settings.transactionFee}
                  onChange={(e) => setSettings({ ...settings, transactionFee: e.target.value })}
                  className="bg-slate-50"
                />
                <p className="text-xs text-slate-500">Phần trăm phí thu trên mỗi giao dịch</p>
              </div>
              <div className="space-y-2">
                <Label>Số tiền rút tối thiểu (VNĐ)</Label>
                <Input
                  type="number"
                  value={settings.minWithdrawal}
                  onChange={(e) => setSettings({ ...settings, minWithdrawal: e.target.value })}
                  className="bg-slate-50"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Phương thức thanh toán</Label>
                <div className="flex flex-wrap gap-3 mt-2">
                  {[
                    { id: 'vnpay', label: 'VNPay' },
                    { id: 'momo', label: 'MoMo' },
                    { id: 'bank', label: 'Chuyển khoản' },
                    { id: 'card', label: 'Thẻ quốc tế' },
                  ].map((method) => (
                    <label key={method.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.paymentMethods.includes(method.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSettings({ ...settings, paymentMethods: [...settings.paymentMethods, method.id] });
                          } else {
                            setSettings({ ...settings, paymentMethods: settings.paymentMethods.filter(m => m !== method.id) });
                          }
                        }}
                        className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                      />
                      <span className="text-sm font-medium text-slate-700">{method.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </SettingsSection>

          {/* Feature Settings */}
          <SettingsSection
            icon={Shield}
            title="Tính năng hệ thống"
            description="Bật/tắt các tính năng của hệ thống"
          >
            <div className="divide-y divide-slate-100">
              <ToggleSwitch
                label="Cho phép đăng ký tài khoản mới"
                enabled={settings.enableRegistration}
                onChange={(v) => setSettings({ ...settings, enableRegistration: v })}
              />
              <ToggleSwitch
                label="Cho phép đăng ký làm Nhà tổ chức"
                enabled={settings.enableOrganizerSignup}
                onChange={(v) => setSettings({ ...settings, enableOrganizerSignup: v })}
              />
              <ToggleSwitch
                label="Yêu cầu xác thực email"
                enabled={settings.requireEmailVerification}
                onChange={(v) => setSettings({ ...settings, requireEmailVerification: v })}
              />
              <ToggleSwitch
                label="Bật thông báo email"
                enabled={settings.enableNotifications}
                onChange={(v) => setSettings({ ...settings, enableNotifications: v })}
              />
            </div>
          </SettingsSection>

          {/* Maintenance Mode */}
          <SettingsSection
            icon={Server}
            title="Chế độ bảo trì"
            description="Tạm đóng website để bảo trì hệ thống"
          >
            <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-800">Chế độ bảo trì</p>
                  <p className="text-sm text-amber-600">Khi bật, người dùng sẽ thấy trang thông báo bảo trì</p>
                </div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                className={`relative w-14 h-7 rounded-full transition-colors ${settings.maintenanceMode ? 'bg-amber-500' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow ${settings.maintenanceMode ? 'translate-x-8' : 'translate-x-1'}`} />
              </button>
            </div>
            {settings.maintenanceMode && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-700 font-medium">
                  ⚠️ Chế độ bảo trì đang BẬT. Website sẽ không khả dụng với người dùng thông thường.
                </p>
              </div>
            )}
          </SettingsSection>

        </div>
      </main>
    </div>
  );
}

