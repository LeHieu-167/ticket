"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, MapPin, Bell, Ticket, Calendar, LogIn, UserPlus, Loader2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import eventService, { EventResponse } from "@/apis/event.service";

// --- HÀM TIỆN ÍCH ---

// 1. Format tiền tệ (VND)
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// 2. Format ngày tháng đẹp
const formatDate = (isoString: string) => {
  if (!isoString) return { day: "00", month: "00", full: "N/A" };
  const date = new Date(isoString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return { day, month, year, time, full: `${day}/${month}/${year}` };
};

// --- COMPONENTS CON ---

// Header: Logo, Search, Login/Register
const Header = () => (
  <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
    <div className="container mx-auto flex h-16 items-center justify-between px-4">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mr-4 hover:opacity-80 transition-opacity">
        <Ticket className="h-6 w-6 text-blue-600" />
        <span className="text-xl font-bold tracking-tight text-blue-900">TicketSystem</span>
      </Link>

      {/* Search Bar (Desktop) */}
      <div className="hidden md:flex flex-1 max-w-md items-center gap-2 rounded-full border bg-slate-50 px-3 py-1.5 mx-4 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        <Search className="h-4 w-4 text-slate-500" />
        <input 
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" 
          placeholder="Tìm sự kiện, nghệ sĩ..." 
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Nút Đăng nhập / Đăng ký */}
        <div className="flex items-center gap-2">
           <Link href="/login">
             <Button variant="ghost" size="sm" className="font-semibold text-slate-600">
               <LogIn className="w-4 h-4 mr-2" />
               Đăng nhập
             </Button>
           </Link>
           <Link href="/register">
             <Button size="sm" className="bg-blue-600 hover:bg-blue-700 hidden sm:flex">
               <UserPlus className="w-4 h-4 mr-2" />
               Đăng ký
             </Button>
           </Link>
        </div>
      </div>
    </div>
  </header>
);

// Hero Banner
const HeroSection = () => (
  <section className="relative w-full h-[350px] md:h-[450px] bg-slate-900 flex items-center overflow-hidden">
     {/* Background Image with Overlay */}
     <div 
        className="absolute inset-0 bg-cover bg-center" 
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop')`}} 
     />
     <div className="absolute inset-0 bg-black/50" /> {/* Dark overlay */}
     <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
     
     <div className="container mx-auto px-4 relative z-10 text-white text-center md:text-left">
        <span className="inline-block py-1 px-3 rounded-full bg-blue-600/80 text-xs font-bold mb-4 backdrop-blur-sm border border-blue-400/30">
          SỰ KIỆN HOT NHẤT 2024
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
          Sống trọn từng khoảnh khắc <br/>
          <span className="text-blue-400">âm nhạc & cảm xúc</span>
        </h1>
        <p className="text-slate-200 text-lg mb-8 max-w-2xl font-light">
          Đặt vé ngay hôm nay để không bỏ lỡ những sự kiện đỉnh cao. Thanh toán an toàn, nhận vé tức thì.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg h-12 px-8">
              Khám phá ngay
            </Button>
            <Button size="lg" variant="outline" className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-lg h-12 px-8 backdrop-blur-sm">
              Tạo sự kiện
            </Button>
        </div>
     </div>
  </section>
);

// Empty State Component
const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
        <div className="bg-white p-6 rounded-full mb-4 shadow-sm">
            <Inbox className="h-10 w-10 text-slate-300" />
        </div>
        <h3 className="text-lg font-semibold text-slate-600">Chưa có sự kiện nào</h3>
        <p className="max-w-xs text-center mt-2 text-sm">Hệ thống đang cập nhật các sự kiện mới nhất. Vui lòng quay lại sau.</p>
    </div>
);

// Event Card Component
const EventCard = ({ event }: { event: EventResponse }) => {
    const { day, month, time } = formatDate(event.eventDate);

    // Xác định ảnh hiển thị: Ưu tiên thumbnail -> banner -> placeholder
    const displayImage = event.thumbnailUrl || event.bannerImageUrl || "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1000&auto=format&fit=crop";

    return (
        <Card className="group overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-2xl cursor-pointer h-full flex flex-col bg-white">
            {/* Image Container */}
            <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                <img 
                    src={displayImage} 
                    alt={event.name} 
                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute top-3 right-3">
                    <span className="bg-white/90 text-blue-800 text-xs font-bold px-2 py-1 rounded backdrop-blur-sm shadow-sm">
                        {event.organizerName || "Organizer"}
                    </span>
                </div>
            </div>

            <CardContent className="p-5 flex flex-col flex-1">
                <div className="flex items-start gap-4 mb-3">
                    {/* Date Box */}
                    <div className="flex flex-col items-center justify-center bg-blue-50 text-blue-700 rounded-xl px-3 py-2 min-w-[60px] shadow-sm border border-blue-100">
                        <span className="text-xs font-bold uppercase tracking-wider">Thg {month}</span>
                        <span className="text-2xl font-extrabold">{day}</span>
                    </div>
                    
                    {/* Title */}
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-900 line-clamp-2 text-lg leading-snug group-hover:text-blue-600 transition-colors">
                            {event.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {time}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-slate-500 text-sm mt-auto mb-4 bg-slate-50 p-2 rounded-lg">
                    <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="truncate font-medium">{event.location}</span>
                </div>
                
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-400 font-medium">Giá từ</p>
                        <span className="font-bold text-blue-600 text-lg">{formatCurrency(event.ticketPrice)}</span>
                    </div>
                    <Button size="sm" className="rounded-full px-5 bg-slate-900 hover:bg-blue-600 text-white transition-colors shadow-sm">
                        Mua vé
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

// --- TRANG CHỦ CHÍNH ---
export default function HomePage() {
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        // Gọi API lấy tất cả sự kiện
        const data = await eventService.getAllEvents();
        setEvents(data);
      } catch (error) {
        console.error("Lỗi khi tải danh sách sự kiện:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 pb-20">
        <HeroSection />

        {/* Filter Bar */}
        <div className="container mx-auto px-4 -mt-8 relative z-20 mb-12">
            <div className="bg-white rounded-xl shadow-xl p-2 border border-slate-100 flex gap-2 items-center max-w-4xl mx-auto">
                 <div className="flex-1 w-full relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input 
                        placeholder="Tìm kiếm tên sự kiện, nghệ sĩ, địa điểm..." 
                        className="pl-12 h-12 border-0 bg-transparent text-lg focus-visible:ring-0 placeholder:text-slate-400" 
                    />
                 </div>
                 <Button size="lg" className="bg-blue-600 hover:bg-blue-700 h-12 px-8 rounded-lg text-base shadow-md shadow-blue-200">
                    Tìm kiếm
                 </Button>
            </div>
        </div>

        {/* Section: Danh sách sự kiện */}
        <section className="container mx-auto px-4">
            <div className="flex items-end justify-between mb-8">
                 <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Sự kiện nổi bật</h2>
                    <p className="text-slate-500 mt-2">Đừng bỏ lỡ những sự kiện hấp dẫn nhất tuần này</p>
                 </div>
                 {events.length > 0 && (
                     <Link href="/events" className="text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1 hover:underline">
                        Xem tất cả <span className="text-lg">→</span>
                     </Link>
                 )}
            </div>
            
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                    <p className="text-slate-500 font-medium animate-pulse">Đang tải sự kiện...</p>
                </div>
            ) : events.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {events.map((event) => (
                        <EventCard key={event.id} event={event} />
                    ))}
                </div>
            ) : (
                <EmptyState />
            )}
        </section>
      </main>

      <footer className="bg-slate-50 border-t py-12">
        <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Ticket className="h-6 w-6 text-blue-600" />
                        <span className="text-xl font-bold text-blue-900">TicketSystem</span>
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        Nền tảng phân phối vé sự kiện hàng đầu Việt Nam. Kết nối đam mê, lan tỏa cảm xúc.
                    </p>
                </div>
                <div>
                    <h4 className="font-bold text-slate-900 mb-4">Về chúng tôi</h4>
                    <ul className="space-y-2 text-sm text-slate-600">
                        <li><a href="#" className="hover:text-blue-600">Giới thiệu</a></li>
                        <li><a href="#" className="hover:text-blue-600">Liên hệ</a></li>
                        <li><a href="#" className="hover:text-blue-600">Tuyển dụng</a></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold text-slate-900 mb-4">Hỗ trợ khách hàng</h4>
                    <ul className="space-y-2 text-sm text-slate-600">
                        <li><a href="#" className="hover:text-blue-600">Trung tâm trợ giúp</a></li>
                        <li><a href="#" className="hover:text-blue-600">Chính sách bảo mật</a></li>
                        <li><a href="#" className="hover:text-blue-600">Điều khoản sử dụng</a></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold text-slate-900 mb-4">Theo dõi chúng tôi</h4>
                    <div className="flex gap-4">
                        {/* Social Icons Placeholder */}
                        <div className="w-8 h-8 bg-slate-200 rounded-full hover:bg-blue-600 transition-colors cursor-pointer"></div>
                        <div className="w-8 h-8 bg-slate-200 rounded-full hover:bg-blue-600 transition-colors cursor-pointer"></div>
                        <div className="w-8 h-8 bg-slate-200 rounded-full hover:bg-blue-600 transition-colors cursor-pointer"></div>
                    </div>
                </div>
            </div>
            <div className="border-t pt-8 text-center text-slate-400 text-sm">
                © 2024 TicketSystem. All rights reserved.
            </div>
        </div>
      </footer>
    </div>
  );
}
