"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { 
  Ticket, CheckCircle, Download, Mail, Calendar, MapPin, 
  Clock, Copy, Share2, Home, Sparkles, Loader2, AlertCircle, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ticketService, { TicketResponse, OrderWithTicketsResponse } from "@/apis/ticket.service";

// --- UTILS ---

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatDate = (isoString: string) => {
  if (!isoString) return "N/A";
  const date = new Date(isoString);
  return date.toLocaleDateString('vi-VN', { 
    weekday: 'long', 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// --- COMPONENTS ---

// Confetti Animation
const Confetti = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
    {[...Array(50)].map((_, i) => (
      <div
        key={i}
        className="absolute animate-confetti"
        style={{
          left: `${Math.random() * 100}%`,
          top: '-20px',
          animationDelay: `${Math.random() * 3}s`,
          animationDuration: `${3 + Math.random() * 2}s`,
        }}
      >
        <div
          className="w-3 h-3 rounded-sm"
          style={{
            backgroundColor: ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'][Math.floor(Math.random() * 5)],
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      </div>
    ))}
    <style jsx>{`
      @keyframes confetti {
        0% {
          transform: translateY(0) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translateY(100vh) rotate(720deg);
          opacity: 0;
        }
      }
      .animate-confetti {
        animation: confetti linear forwards;
      }
    `}</style>
  </div>
);

// Single Ticket Card with QR Code
interface TicketCardProps {
  ticket: TicketResponse;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onDownload: (ticketCode: string) => void;
}

const TicketCard = ({ ticket, index, isExpanded, onToggle, onDownload }: TicketCardProps) => {
  const qrImageSrc = ticket.qrCodeDataUri || 
    (ticket.qrCodeBase64 ? ticketService.createDataUri(ticket.qrCodeBase64) : null);

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100">
      {/* Header - Always visible */}
      <button 
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
            #{index + 1}
          </div>
          <div className="text-left">
            <p className="font-bold text-slate-900">{ticket.ticketType || 'Vé'}</p>
            <p className="text-sm text-slate-500 font-mono">{ticket.ticketCode}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold
            ${ticket.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
              ticket.status === 'USED' ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-700'}`}>
            {ticket.status === 'ACTIVE' ? 'Còn hiệu lực' : 
             ticket.status === 'USED' ? 'Đã sử dụng' : 'Hết hạn'}
          </span>
          {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </button>

      {/* Expanded Content with QR Code */}
      {isExpanded && (
        <div className="border-t border-slate-100">
          {/* QR Code Section */}
          <div className="p-6 bg-gradient-to-b from-slate-50 to-white flex flex-col items-center">
            {qrImageSrc ? (
              <div className="bg-white p-4 rounded-2xl shadow-inner border-2 border-slate-100">
                <img 
                  src={qrImageSrc} 
                  alt={`QR Code - ${ticket.ticketCode}`}
                  className="w-48 h-48 object-contain"
                />
              </div>
            ) : (
              <div className="w-48 h-48 bg-slate-100 rounded-2xl flex items-center justify-center">
                <div className="text-center text-slate-400">
                  <Ticket className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm">Đang tải QR...</p>
                </div>
              </div>
            )}
            
            {/* Ticket Code Text - Backup for scanning issues */}
            <div className="mt-4 text-center">
              <p className="text-xs text-slate-500 mb-1">Mã vé (nhập tay nếu cần)</p>
              <p className="font-mono text-lg font-bold text-slate-900 bg-slate-100 px-4 py-2 rounded-xl">
                {ticket.ticketCode}
              </p>
            </div>
          </div>

          {/* Ticket Details */}
          <div className="p-4 space-y-3">
            {ticket.seatInfo && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Ghế</span>
                <span className="font-medium text-slate-900">{ticket.seatInfo}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Giá vé</span>
              <span className="font-medium text-violet-600">{formatCurrency(ticket.price)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-slate-100 flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 rounded-xl"
              onClick={() => onDownload(ticket.ticketCode)}
            >
              <Download className="w-4 h-4 mr-2" />
              Tải QR Code
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN PAGE ---
export default function ConfirmationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.eventId as string;
  const orderId = searchParams.get('orderId');

  const [orderData, setOrderData] = useState<any>(null);
  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expandedTickets, setExpandedTickets] = useState<Set<number>>(new Set([0])); // First ticket expanded by default
  const [downloadingTicket, setDownloadingTicket] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Get order data from session
    const data = sessionStorage.getItem('orderData');
    if (data) {
      setOrderData(JSON.parse(data));
    }

    // Fetch tickets from API
    const fetchTickets = async () => {
      if (!orderId) {
        setIsLoading(false);
        return;
      }

      try {
        // Get tickets by order ID (orderId is now a UUID string)
        const ticketsData = await ticketService.getTicketsByOrderId(orderId);
        setTickets(ticketsData);
      } catch (error) {
        console.error('Error fetching tickets:', error);
        // Generate mock tickets for demo
        const mockTickets: TicketResponse[] = [
          {
            id: `ticket-${orderId}-001`,
            ticketCode: `TICKET-${orderId}-001`,
            orderId: orderId || 'mock-order-id',
            eventId: eventId,
            eventName: orderData?.eventName || 'Sự kiện',
            eventDate: new Date().toISOString(),
            eventLocation: 'Hà Nội',
            ticketType: 'VIP',
            price: 2000000,
            status: 'ACTIVE',
            qrCodeBase64: '', // Will show placeholder
            createdAt: new Date().toISOString()
          }
        ];
        setTickets(mockTickets);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickets();

    // Hide confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, [orderId, eventId]);

  const handleCopyOrderId = () => {
    if (orderId) {
      navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Đặt vé thành công - TicketHub',
          text: `Tôi vừa đặt vé thành công! Mã đơn hàng: ${orderId}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    }
  };

  const handleToggleTicket = (index: number) => {
    setExpandedTickets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleDownloadQR = async (ticketCode: string) => {
    setDownloadingTicket(ticketCode);
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
    } finally {
      setDownloadingTicket(null);
    }
  };

  const handleResendEmail = async () => {
    try {
      // Resend email for all tickets
      for (const ticket of tickets) {
        await ticketService.resendTicketEmail(ticket.id);
      }
      alert('Đã gửi lại vé đến email của bạn!');
    } catch (error) {
      console.error('Error resending email:', error);
      alert('Không thể gửi email. Vui lòng thử lại sau.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
      {/* Confetti */}
      {isClient && showConfetti && <Confetti />}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <Ticket className="h-6 w-6 text-violet-600" />
              <span className="text-xl font-bold text-slate-900">TicketHub</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-2xl mx-auto">
          {/* Success Message */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-2xl shadow-green-200 mb-6">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-yellow-500" />
              <h1 className="text-3xl md:text-4xl font-black text-slate-900">
                Đặt vé thành công!
              </h1>
              <Sparkles className="w-6 h-6 text-yellow-500" />
            </div>
            
            <p className="text-slate-500 text-lg">
              Cảm ơn bạn đã đặt vé. Vé điện tử đã được gửi đến email của bạn.
            </p>
          </div>

          {/* Order ID */}
          <Card className="mb-6 border-0 shadow-lg rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Mã đơn hàng</p>
                  <p className="text-2xl font-black text-slate-900">{orderId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleCopyOrderId}
                    className="rounded-xl"
                  >
                    {copied ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleShare}
                    className="rounded-xl"
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tickets List with QR Codes */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-violet-600" />
              Vé của bạn ({tickets.length})
            </h2>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
              </div>
            ) : tickets.length > 0 ? (
              <div className="space-y-4">
                {tickets.map((ticket, index) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    index={index}
                    isExpanded={expandedTickets.has(index)}
                    onToggle={() => handleToggleTicket(index)}
                    onDownload={handleDownloadQR}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-0 shadow-lg rounded-2xl">
                <CardContent className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Không tìm thấy vé</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Buyer Info */}
          {orderData?.buyerInfo && (
            <Card className="mb-6 border-0 shadow-lg rounded-2xl">
              <CardContent className="p-6">
                <h3 className="font-bold text-slate-900 mb-4">Thông tin người mua</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                      <span className="text-violet-600 font-bold">
                        {orderData.buyerInfo.fullName?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{orderData.buyerInfo.fullName}</p>
                      <p className="text-sm text-slate-500">{orderData.buyerInfo.email}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Steps */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50">
            <CardContent className="p-6">
              <h3 className="font-bold text-slate-900 mb-4">Các bước tiếp theo</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Kiểm tra email</p>
                    <p className="text-sm text-slate-500">Vé điện tử đã được gửi đến {orderData?.buyerInfo?.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Lưu mã QR</p>
                    <p className="text-sm text-slate-500">Tải về hoặc chụp màn hình mã QR để check-in</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Đến sự kiện</p>
                    <p className="text-sm text-slate-500">Xuất trình mã QR tại cổng vào để check-in</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/my-tickets" className="flex-1">
              <Button 
                variant="outline"
                className="w-full h-14 rounded-2xl text-base font-semibold"
              >
                <Ticket className="w-5 h-5 mr-2" />
                Xem vé của tôi
              </Button>
            </Link>
            <Button 
              variant="outline"
              className="flex-1 h-14 rounded-2xl text-base font-semibold"
              onClick={handleResendEmail}
            >
              <Mail className="w-5 h-5 mr-2" />
              Gửi lại email
            </Button>
          </div>

          {/* Back to Home */}
          <div className="text-center mt-8">
            <Link href="/">
              <Button 
                className="h-14 px-8 rounded-2xl text-base font-semibold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg"
              >
                <Home className="w-5 h-5 mr-2" />
                Về trang chủ
              </Button>
            </Link>
          </div>

          {/* Support */}
          <div className="text-center mt-8 text-slate-500 text-sm">
            <p>Cần hỗ trợ? Liên hệ <a href="mailto:support@tickethub.vn" className="text-violet-600 hover:underline">support@tickethub.vn</a></p>
          </div>
        </div>
      </main>
    </div>
  );
}
