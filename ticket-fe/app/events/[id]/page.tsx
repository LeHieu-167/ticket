"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  Ticket, MapPin, Calendar, Clock, Users, Share2, Heart, 
  ChevronLeft, Loader2, AlertCircle, CheckCircle, Star,
  Building2, FileText, Music, Mic2, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layouts/Header";
import eventService, { EventResponse, ArtistInfo } from "@/apis/event.service";

// --- HÀM TIỆN ÍCH ---

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatDate = (isoString: string) => {
  if (!isoString) return { day: "00", month: "00", full: "N/A", weekday: "", time: "" };
  const date = new Date(isoString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const weekday = date.toLocaleDateString('vi-VN', { weekday: 'long' });
  const monthName = date.toLocaleDateString('vi-VN', { month: 'long' });
  return { day, month, year, time, weekday, monthName, full: `${day}/${month}/${year}` };
};

const formatDateRange = (startDate: string, endDate?: string) => {
  const start = formatDate(startDate);
  if (!endDate) {
    return `${start.weekday}, ${start.full} • ${start.time}`;
  }
  const end = formatDate(endDate);
  if (start.full === end.full) {
    return `${start.weekday}, ${start.full} • ${start.time} - ${end.time}`;
  }
  return `${start.full} - ${end.full}`;
};

// Mock artists data (since backend might not have this yet)
const getMockArtists = (eventName: string): ArtistInfo[] => {
  // Return empty if no event name contains music-related keywords
  const musicKeywords = ['concert', 'live', 'show', 'nhạc', 'ca sĩ', 'dj', 'festival'];
  const isMusicEvent = musicKeywords.some(kw => eventName.toLowerCase().includes(kw));
  
  if (!isMusicEvent) return [];
  
  return [
    {
      id: "artist-001",
      name: "Nghệ sĩ chính",
      role: "Ca sĩ",
      imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop",
      description: "Nghệ sĩ hàng đầu với nhiều năm kinh nghiệm biểu diễn"
    },
    {
      id: "artist-002",
      name: "Khách mời đặc biệt",
      role: "DJ",
      imageUrl: "https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=200&h=200&fit=crop",
      description: "DJ nổi tiếng với phong cách âm nhạc độc đáo"
    }
  ];
};

// --- COMPONENTS ---

// Artist Card Component
const ArtistCard = ({ artist }: { artist: ArtistInfo }) => (
  <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:shadow-lg transition-shadow">
    <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
      {artist.imageUrl ? (
        <img 
          src={artist.imageUrl} 
          alt={artist.name} 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600">
          <User className="w-8 h-8 text-white" />
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-bold text-slate-900 text-lg">{artist.name}</h4>
      <p className="text-violet-600 text-sm font-medium flex items-center gap-1">
        {artist.role === 'Ca sĩ' && <Mic2 className="w-4 h-4" />}
        {artist.role === 'DJ' && <Music className="w-4 h-4" />}
        {artist.role || 'Nghệ sĩ'}
      </p>
      {artist.description && (
        <p className="text-slate-500 text-sm mt-1 line-clamp-2">{artist.description}</p>
      )}
    </div>
  </div>
);

// Ticket Availability Badge
const AvailabilityBadge = ({ available, total }: { available: number; total?: number }) => {
  const percentage = total ? (available / total) * 100 : 50;
  
  if (available === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
        <AlertCircle className="w-4 h-4" />
        Hết vé
      </span>
    );
  }
  
  if (percentage <= 20) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold animate-pulse">
        <AlertCircle className="w-4 h-4" />
        Sắp hết - Còn {available} vé
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
      <CheckCircle className="w-4 h-4" />
      Còn {available} vé
    </span>
  );
};

// Loading State
const LoadingState = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center">
      <Loader2 className="h-12 w-12 animate-spin text-violet-600 mx-auto mb-4" />
      <p className="text-slate-500 font-medium">Đang tải thông tin sự kiện...</p>
    </div>
  </div>
);

// Error State
const ErrorState = ({ message }: { message: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center max-w-md mx-auto px-4">
      <div className="bg-red-100 p-6 rounded-full w-fit mx-auto mb-6">
        <AlertCircle className="h-12 w-12 text-red-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Không tìm thấy sự kiện</h2>
      <p className="text-slate-500 mb-6">{message}</p>
      <Link href="/events">
        <Button className="bg-violet-600 hover:bg-violet-700">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Quay lại danh sách
        </Button>
      </Link>
    </div>
  </div>
);

// --- MAIN PAGE ---
export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [selectedTicketCount, setSelectedTicketCount] = useState(1);

  // Fetch event details
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        const data = await eventService.getEventById(eventId);
        setEvent(data);
      } catch (err) {
        console.error("Lỗi khi tải chi tiết sự kiện:", err);
        setError("Sự kiện không tồn tại hoặc đã bị xóa.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  if (isLoading) return <LoadingState />;
  if (error || !event) return <ErrorState message={error || "Đã có lỗi xảy ra"} />;

  const { day, month, year, time, weekday, monthName } = formatDate(event.eventDate);
  const displayImage = event.bannerImageUrl || event.thumbnailUrl || 
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop";
  
  const artists = event.artists || getMockArtists(event.name);
  const totalPrice = event.ticketPrice * selectedTicketCount;

  // Check if event is active and selling
  const isEventActive = event.isActive && event.status === 'ACTIVE';
  const isSoldOut = event.availableTickets === 0;

  const handleBuyTicket = () => {
    // Check if user is logged in
    const token = localStorage.getItem('accessToken');
    if (!token) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/booking/${event.id}/tickets`);
      return;
    }
    
    // Navigate to booking flow
    router.push(`/booking/${event.id}/tickets`);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.name,
          text: `Xem sự kiện: ${event.name}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Đã sao chép link sự kiện!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header activeNav="events" />

      <main className="flex-1">
        {/* Banner Section */}
        <section className="relative h-[300px] md:h-[450px] overflow-hidden">
          <img 
            src={displayImage} 
            alt={event.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          {/* Back Button */}
          <div className="absolute top-4 left-4 z-10">
            <Link href="/events">
              <Button variant="outline" size="sm" className="bg-white/90 hover:bg-white backdrop-blur-sm rounded-full">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Quay lại
              </Button>
            </Link>
          </div>

          {/* Action Buttons */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="bg-white/90 hover:bg-white backdrop-blur-sm rounded-full"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className={`backdrop-blur-sm rounded-full transition-colors ${isLiked ? 'bg-red-500 text-white hover:bg-red-600 border-red-500' : 'bg-white/90 hover:bg-white'}`}
              onClick={() => setIsLiked(!isLiked)}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </Button>
          </div>

          {/* Category Badge */}
          <div className="absolute bottom-6 left-6 z-10">
            <span className="bg-violet-600 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
              {event.category || "Sự kiện"}
            </span>
          </div>
        </section>

        {/* Content Section */}
        <section className="container mx-auto px-4 -mt-16 relative z-20 pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Event Title Card */}
              <Card className="overflow-hidden border-0 shadow-xl rounded-3xl">
                <CardContent className="p-6 md:p-8">
                  <h1 className="text-2xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">
                    {event.name}
                  </h1>

                  {/* Date & Time */}
                  <div className="flex flex-wrap items-center gap-6 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-xl px-4 py-3 shadow-lg">
                        <span className="text-xs font-bold uppercase tracking-wider opacity-90">Thg {month}</span>
                        <span className="text-3xl font-black">{day}</span>
                        <span className="text-xs font-medium opacity-90">{year}</span>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-900 capitalize">{weekday}</p>
                        <p className="text-slate-500 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {time}
                          {event.eventEndDate && ` - ${formatDate(event.eventEndDate).time}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl mb-4">
                    <MapPin className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900">{event.location}</p>
                      {event.address && (
                        <p className="text-slate-500 text-sm mt-1">{event.address}</p>
                      )}
                    </div>
                  </div>

                  {/* Organizer */}
                  {event.organizerName && (
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                      <Building2 className="w-5 h-5 text-violet-600 shrink-0" />
                      <div>
                        <p className="text-sm text-slate-500">Tổ chức bởi</p>
                        <p className="font-bold text-slate-900">{event.organizerName}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Description Card */}
              <Card className="border-0 shadow-lg rounded-3xl">
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-violet-600" />
                    Giới thiệu sự kiện
                  </h2>
                  <div className="prose prose-slate max-w-none">
                    <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                      {event.description || 
                        `Chào mừng bạn đến với ${event.name}!
                        
Đây là sự kiện đặc biệt được tổ chức tại ${event.location}. Sự kiện hứa hẹn mang đến cho bạn những trải nghiệm tuyệt vời và đáng nhớ.

Hãy đặt vé ngay để không bỏ lỡ cơ hội tham gia sự kiện này!`}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Artists/Performers Section */}
              {artists.length > 0 && (
                <Card className="border-0 shadow-lg rounded-3xl">
                  <CardContent className="p-6 md:p-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <Star className="w-5 h-5 text-violet-600" />
                      Nghệ sĩ / Diễn giả
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {artists.map((artist, index) => (
                        <ArtistCard key={artist.id || index} artist={artist} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Terms and Conditions */}
              {event.termsAndConditions && (
                <Card className="border-0 shadow-lg rounded-3xl">
                  <CardContent className="p-6 md:p-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-violet-600" />
                      Điều khoản & Điều kiện
                    </h2>
                    <div className="prose prose-slate prose-sm max-w-none">
                      <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                        {event.termsAndConditions}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar - Ticket Purchase */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <Card className="border-0 shadow-xl rounded-3xl overflow-hidden">
                  <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white">
                    <h3 className="text-lg font-bold mb-2">Thông tin vé</h3>
                    <AvailabilityBadge 
                      available={event.availableTickets} 
                      total={event.totalTickets} 
                    />
                  </div>
                  
                  <CardContent className="p-6 space-y-6">
                    {/* Ticket Price */}
                    <div className="text-center py-4 bg-slate-50 rounded-2xl">
                      <p className="text-sm text-slate-500 mb-1">Giá vé</p>
                      <p className="text-3xl font-black text-violet-600">
                        {formatCurrency(event.ticketPrice)}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">/ 1 vé</p>
                    </div>

                    {/* CTA Button */}
                    <Button 
                      className="w-full h-14 text-lg font-bold rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-200 transition-all hover:shadow-xl hover:shadow-violet-300"
                      onClick={handleBuyTicket}
                      disabled={!isEventActive || isSoldOut}
                    >
                      {!isEventActive ? (
                        <>
                          <AlertCircle className="w-5 h-5 mr-2" />
                          Tạm ngừng bán
                        </>
                      ) : isSoldOut ? (
                        <>
                          <AlertCircle className="w-5 h-5 mr-2" />
                          Hết vé
                        </>
                      ) : (
                        <>
                          <Ticket className="w-5 h-5 mr-2" />
                          Mua vé ngay
                        </>
                      )}
                    </Button>

                    {/* Additional Info */}
                    <div className="space-y-2 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Thanh toán an toàn & bảo mật</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Nhận vé điện tử qua email</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Hỗ trợ 24/7</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Mobile Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-4 lg:hidden z-50">
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500">Giá từ</p>
            <p className="text-xl font-black text-violet-600">{formatCurrency(event.ticketPrice)}</p>
          </div>
          <Button 
            className="flex-1 max-w-[200px] h-12 text-base font-bold rounded-xl bg-gradient-to-r from-violet-600 to-purple-600"
            onClick={handleBuyTicket}
            disabled={!isEventActive || isSoldOut}
          >
            {!isEventActive ? 'Ngừng bán' : isSoldOut ? 'Hết vé' : 'Mua vé'}
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 hidden lg:block">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Ticket className="h-6 w-6 text-violet-400" />
              <span className="text-xl font-bold">TicketHub</span>
            </div>
            <p className="text-slate-400 text-sm">
              © 2024 TicketHub. Nền tảng đặt vé sự kiện hàng đầu Việt Nam.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}


