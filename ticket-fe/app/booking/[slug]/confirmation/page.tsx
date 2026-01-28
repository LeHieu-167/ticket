"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  Ticket, CheckCircle, Download, Mail, Calendar, MapPin, 
  Clock, Copy, Share2, Home, Sparkles, Loader2, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ticketService, { TicketResponse, OrderWithTicketsResponse } from "@/apis/ticket.service";
import TicketCarousel from "@/components/tickets/TicketCarousel";

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


// --- MAIN PAGE ---
export default function ConfirmationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [orderData, setOrderData] = useState<any>(null);
  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(true);
  const [copied, setCopied] = useState(false);
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
            eventId: slug,
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
  }, [orderId, slug]);

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

          {/* Tickets Carousel */}
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
              <>
                <TicketCarousel 
                  tickets={tickets}
                  onDownload={handleDownloadQR}
                />
                
                {/* Info Banner for multiple tickets */}
                {tickets.length > 1 && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                    <p className="text-sm text-blue-800">
                      <strong>💡 Lưu ý quan trọng:</strong> Mỗi vé có mã QR riêng biệt. 
                      Khi đến sự kiện, mỗi người cần xuất trình vé riêng của mình để check-in. 
                      Vuốt sang trái/phải để xem các vé khác.
                    </p>
                  </div>
                )}
              </>
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
