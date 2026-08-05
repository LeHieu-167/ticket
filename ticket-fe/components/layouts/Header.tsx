"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Ticket, LogIn, UserPlus, ChevronDown, 
  TicketIcon, User, LogOut, Settings, LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBookingNavigation } from "@/components/providers/BookingNavigationContext";

interface UserData {
  id: string;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
}

interface HeaderProps {
  activeNav?: 'home' | 'events' | 'none';
}

export const Header = ({ activeNav = 'home' }: HeaderProps) => {
  const router = useRouter();
  const { safeNavigate } = useBookingNavigation();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for user data in localStorage
    const checkAuth = () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        const userDataStr = localStorage.getItem('user');
        
        if (accessToken && userDataStr) {
          const userData = JSON.parse(userDataStr);
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for storage changes (login/logout in other tabs)
    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    safeNavigate('/');
  };

  const getNavClass = (nav: string) => {
    if (activeNav === nav) {
      return "px-4 py-2 text-sm font-medium text-violet-600 bg-violet-50 rounded-full";
    }
    return "px-4 py-2 text-sm font-medium text-slate-600 hover:text-violet-600 hover:bg-violet-50 rounded-full transition-colors";
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.fullName) return user?.username?.charAt(0)?.toUpperCase() || 'U';
    const names = user.fullName.split(' ');
    if (names.length >= 2) {
      return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    }
    return names[0].charAt(0).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-violet-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 mr-4 hover:opacity-80 transition-opacity">
          <div className="bg-gradient-to-br from-violet-600 to-purple-600 p-2 rounded-xl">
            <Ticket className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight bg-gradient-to-r from-violet-700 to-purple-600 bg-clip-text text-transparent">
            TicketHub
          </span>
        </Link>

        {/* Navigation - Removed as events are now on homepage */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
        </nav>

        {/* Auth Section */}
        <div className="flex items-center gap-2">
          {isLoading ? (
            // Loading state
            <div className="w-24 h-9 bg-slate-100 rounded-lg animate-pulse" />
          ) : user ? (
            // Logged in - Show user dropdown
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2 px-3 py-2 h-auto bg-emerald-500 hover:bg-emerald-600 text-white rounded-full"
                >
                  <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
                    {getUserInitials()}
                  </div>
                  <span className="font-medium hidden sm:inline">Tài khoản</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white shadow-xl border border-slate-100 rounded-xl p-2">
                {/* User info header */}
                <div className="px-3 py-2 mb-1">
                  <p className="font-semibold text-slate-900 truncate">{user.fullName || user.username}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-slate-100" />
                
                {/* Menu items */}
                {user.roles.includes('ROLE_ORGANIZER') && (
                  <DropdownMenuItem 
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-violet-50 focus:bg-violet-50 mb-1"
                    onClick={() => safeNavigate('/organizer/dashboard')}
                  >
                    <LayoutDashboard className="w-4 h-4 text-violet-600" />
                    <span className="font-medium text-violet-700">Tổ chức của tôi</span>
                  </DropdownMenuItem>
                )}

                {user.roles.includes('ROLE_ADMIN') && (
                  <DropdownMenuItem 
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-blue-50 focus:bg-blue-50 mb-1"
                    onClick={() => safeNavigate('/admin/dashboard')}
                  >
                    <Settings className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-700">Quản lý hệ thống</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem 
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-slate-50 focus:bg-slate-50"
                  onClick={() => safeNavigate('/my-tickets')}
                >
                  <TicketIcon className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-700">Vé của tôi</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-slate-50 focus:bg-slate-50"
                  onClick={() => safeNavigate('/profile')}
                >
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-700">Tài khoản của tôi</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-slate-100 my-1" />
                
                <DropdownMenuItem 
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-red-50 focus:bg-red-50 text-red-600"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-medium">Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            // Not logged in - Show login/register buttons
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="font-semibold text-slate-600 hover:text-violet-600">
                  <LogIn className="w-4 h-4 mr-2" />
                  Đăng nhập
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-200 hidden sm:flex">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Đăng ký
                </Button>
              </Link>
              <Link href="/admin/login">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="border-slate-300 hover:bg-slate-100 hover:border-slate-400"
                  title="Đăng nhập Admin"
                >
                  <Settings className="w-4 h-4 text-slate-600" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

