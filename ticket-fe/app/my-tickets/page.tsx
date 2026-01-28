"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Ticket, Calendar, MapPin, Clock, Download, ChevronRight,
  Loader2, AlertCircle, Search, Filter, QrCode, User,
  CheckCircle, XCircle, ChevronLeft, Wifi, WifiOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layouts/Header";
import ticketService, { TicketResponse } from "@/apis/ticket.service";
import { useWebSocket, TicketCheckinData } from "@/hooks/use-websocket";
import TicketCarousel from "@/components/tickets/TicketCarousel";

// --- UTILS ---

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatDate = (isoString: string) => {
  if (!isoString) return "N/A";
  const date = new Date(isoString);
  return date.toLocaleDateString('vi-VN', { 
    weekday: 'short',
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
  });
};

const formatTime = (isoString: string) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleTimeString('vi-VN', { 
    hour: '2-digit',
    minute: '2-digit'
  });
};

const isUpcoming = (dateString: string) => {
  return new Date(dateString) > new Date();
};

// --- COMPONENTS ---

// Ticket Card for List View
interface TicketListCardProps {
  ticket: TicketResponse;
  onClick: () => void;
}

const TicketListCard = ({ ticket, onClick }: TicketListCardProps) => {
  const upcoming = isUpcoming(ticket.eventDate);
  
  return (
    <Card 
      className={`border-0 shadow-md hover:shadow-lg transition-all cursor-pointer overflow-hidden
        ${!upcoming ? 'opacity-75' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="flex">
          {/* Date Badge */}
          <div className={`w-20 flex flex-col items-center justify-center py-4 text-white
            ${upcoming ? 'bg-gradient-to-b from-violet-600 to-purple-600' : 'bg-slate-400'}`}>
            <span className="text-2xl font-black">
              {new Date(ticket.eventDate).getDate()}
            </span>
            <span className="text-xs uppercase">
              Thg {new Date(ticket.eventDate).getMonth() + 1}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 truncate">{ticket.eventName}</h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatTime(ticket.eventDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {ticket.eventLocation}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full font-medium">
                    {ticket.ticketType}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium
                    ${ticket.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                      ticket.status === 'USED' ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-700'}`}>
                    {ticket.status === 'ACTIVE' ? 'Còn hiệu lực' : 
                     ticket.status === 'USED' ? 'Đã sử dụng' : 'Hết hạn'}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Ticket Carousel Modal - Shows all tickets from the same order
interface TicketCarouselModalProps {
  tickets: TicketResponse[];
  initialIndex: number;
  onClose: () => void;
  onDownload: (ticketCode: string) => void;
}

const TicketCarouselModal = ({ tickets, initialIndex, onClose, onDownload }: TicketCarouselModalProps) => {
  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-50 rounded-3xl w-full max-w-lg max-h-[95vh] overflow-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b p-4 flex items-center justify-between z-10">
          <button 
            onClick={onClose} 
            className="flex items-center gap-2 text-slate-600 hover:text-violet-600 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">Quay lại</span>
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Ticket className="w-4 h-4" />
            <span>{tickets.length} vé trong đơn hàng</span>
          </div>
        </div>

        {/* Carousel */}
        <div className="py-6">
          <TicketCarousel 
            tickets={tickets}
            onDownload={onDownload}
          />
        </div>

        {/* Info Banner */}
        <div className="mx-4 mb-4 p-4 bg-blue-50 rounded-xl">
          <p className="text-sm text-blue-800">
            <strong>💡 Mỗi vé có mã QR riêng.</strong> Khi check-in, mỗi người xuất trình vé của mình để được quét riêng lẻ.
          </p>
        </div>
      </div>
    </div>
  );
};

// Empty State
const EmptyState = () => (
  <div className="text-center py-16">
    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <Ticket className="w-12 h-12 text-slate-300" />
    </div>
    <h3 className="text-xl font-bold text-slate-900 mb-2">Chưa có vé nào</h3>
    <p className="text-slate-500 mb-6">Bạn chưa đặt vé cho sự kiện nào.</p>
    <Link href="/">
      <Button className="bg-violet-600 hover:bg-violet-700">
        Khám phá sự kiện
      </Button>
    </Link>
  </div>
);

// --- MAIN PAGE ---
export default function MyTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<TicketResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'past'>('all');
  const [selectedOrderTickets, setSelectedOrderTickets] = useState<TicketResponse[] | null>(null);
  const [selectedTicketIndex, setSelectedTicketIndex] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [checkinNotification, setCheckinNotification] = useState<string | null>(null);

  // Group tickets by order for carousel display
  const getTicketsByOrder = (orderId: string): TicketResponse[] => {
    return tickets.filter(t => t.orderId === orderId);
  };

  // Handle ticket click - show all tickets from same order in carousel
  const handleTicketClick = (ticket: TicketResponse) => {
    const orderTickets = getTicketsByOrder(ticket.orderId);
    const ticketIndex = orderTickets.findIndex(t => t.id === ticket.id);
    setSelectedOrderTickets(orderTickets);
    setSelectedTicketIndex(ticketIndex >= 0 ? ticketIndex : 0);
  };

  // Check auth & get userId
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login?redirect=/my-tickets');
      return;
    }
    
    // Get userId from userData
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserId(user.id);
      } catch (e) {
        console.error('Error parsing userData:', e);
      }
    }
  }, [router]);

  // Callback khi vé được check-in realtime
  const handleTicketCheckedIn = useCallback((data: TicketCheckinData) => {
    console.log('🎫 Ticket checked in:', data);
    
    // Update tickets list
    setTickets(prev => prev.map(ticket => 
      ticket.id === data.ticketId 
        ? { ...ticket, status: 'USED' as const, checkedInAt: data.checkedInAt }
        : ticket
    ));
    
    // Update selected order tickets if viewing
    setSelectedOrderTickets(prev => 
      prev?.map(ticket => 
        ticket.id === data.ticketId 
          ? { ...ticket, status: 'USED' as const, checkedInAt: data.checkedInAt }
          : ticket
      ) || null
    );

    // Show notification
    setCheckinNotification(`Vé ${data.ticketCode} đã được check-in!`);
    setTimeout(() => setCheckinNotification(null), 5000);
  }, []);

  // WebSocket connection for realtime updates
  const { status: wsStatus, isConnected } = useWebSocket({
    userId,
    onTicketCheckedIn: handleTicketCheckedIn,
  });

  // Fetch tickets
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const data = await ticketService.getMyTickets();
        setTickets(data);
        setFilteredTickets(data);
      } catch (error) {
        console.error('Error fetching tickets:', error);
        // Mock data for demo
        const mockTickets: TicketResponse[] = [
          {
            id: 'ticket-001-abc123',
            ticketCode: 'TICKET-ABC123-001',
            orderId: 'order-001-xyz',
            eventId: 'event-001-mytam',
            eventName: 'Concert Mỹ Tâm - Live in Hanoi',
            eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            eventLocation: 'Hà Nội',
            eventAddress: 'Nhà hát Lớn Hà Nội, Tràng Tiền',
            ticketType: 'VIP',
            price: 2000000,
            status: 'ACTIVE',
            qrCodeBase64: '',
            createdAt: new Date().toISOString()
          },
          {
            id: 'ticket-002-def456',
            ticketCode: 'TICKET-DEF456-002',
            orderId: 'order-002-abc',
            eventId: 'event-002-festival',
            eventName: 'Festival Âm nhạc Quốc tế',
            eventDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            eventLocation: 'TP.HCM',
            eventAddress: 'Phú Mỹ Hưng, Quận 7',
            ticketType: 'Premium',
            price: 1500000,
            status: 'ACTIVE',
            qrCodeBase64: '',
            createdAt: new Date().toISOString()
          },
          {
            id: 'ticket-003-ghi789',
            ticketCode: 'TICKET-GHI789-003',
            orderId: 'order-003-def',
            eventId: 'event-003-techconf',
            eventName: 'Tech Conference 2024',
            eventDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            eventLocation: 'Đà Nẵng',
            ticketType: 'Standard',
            price: 500000,
            status: 'USED',
            checkedInAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
            createdAt: new Date().toISOString()
          }
        ];
        setTickets(mockTickets);
        setFilteredTickets(mockTickets);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickets();
  }, []);

  // Filter tickets
  useEffect(() => {
    let result = tickets;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.eventName.toLowerCase().includes(query) ||
        t.ticketCode.toLowerCase().includes(query) ||
        t.eventLocation.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterStatus === 'upcoming') {
      result = result.filter(t => isUpcoming(t.eventDate) && t.status === 'ACTIVE');
    } else if (filterStatus === 'past') {
      result = result.filter(t => !isUpcoming(t.eventDate) || t.status !== 'ACTIVE');
    }

    // Sort by date (upcoming first)
    result = [...result].sort((a, b) => {
      const aUpcoming = isUpcoming(a.eventDate);
      const bUpcoming = isUpcoming(b.eventDate);
      if (aUpcoming && !bUpcoming) return -1;
      if (!aUpcoming && bUpcoming) return 1;
      return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
    });

    setFilteredTickets(result);
  }, [tickets, searchQuery, filterStatus]);

  const handleDownloadQR = async (ticketCode: string) => {
    try {
      const blob = await ticketService.downloadQRCode(ticketCode);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${ticketCode}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading QR:', error);
      alert('Không thể tải QR Code. Vui lòng thử lại sau.');
    }
  };

  const upcomingCount = tickets.filter(t => isUpcoming(t.eventDate) && t.status === 'ACTIVE').length;
  const pastCount = tickets.filter(t => !isUpcoming(t.eventDate) || t.status !== 'ACTIVE').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header activeNav="none" />

      {/* Check-in Notification Toast */}
      {checkinNotification && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className="bg-green-500 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">{checkinNotification}</span>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">Vé của tôi</h1>
            <p className="text-slate-500">Quản lý tất cả vé sự kiện của bạn</p>
          </div>
          
          {/* WebSocket Status Indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
            ${isConnected 
              ? 'bg-green-100 text-green-700' 
              : 'bg-slate-100 text-slate-500'}`}
          >
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>Realtime</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline</span>
              </>
            )}
          </div>
        </div>

        {/* Search & Filter */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên sự kiện, mã vé..."
              className="pl-12 h-12 rounded-xl"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('all')}
              className="rounded-full"
            >
              Tất cả ({tickets.length})
            </Button>
            <Button
              variant={filterStatus === 'upcoming' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('upcoming')}
              className="rounded-full"
            >
              Sắp diễn ra ({upcomingCount})
            </Button>
            <Button
              variant={filterStatus === 'past' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('past')}
              className="rounded-full"
            >
              Đã qua ({pastCount})
            </Button>
          </div>
        </div>

        {/* Tickets List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        ) : filteredTickets.length > 0 ? (
          <div className="space-y-4">
            {filteredTickets.map(ticket => (
              <TicketListCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => handleTicketClick(ticket)}
              />
            ))}
          </div>
        ) : tickets.length > 0 ? (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Không tìm thấy vé phù hợp</p>
          </div>
        ) : (
          <EmptyState />
        )}
      </main>

      {/* Ticket Carousel Modal */}
      {selectedOrderTickets && selectedOrderTickets.length > 0 && (
        <TicketCarouselModal
          tickets={selectedOrderTickets}
          initialIndex={selectedTicketIndex}
          onClose={() => setSelectedOrderTickets(null)}
          onDownload={handleDownloadQR}
        />
      )}
    </div>
  );
}

