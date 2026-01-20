"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Ticket, LayoutDashboard, PlusCircle, QrCode, LogOut,
  Search, Download, Mail, Printer, Eye, ChevronLeft,
  Loader2, AlertCircle, CheckCircle, XCircle, User,
  Calendar, MapPin, Clock, Package, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ticketService, { TicketResponse, OrderWithTicketsResponse } from "@/apis/ticket.service";

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
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// --- COMPONENTS ---

// Sidebar Navigation
const Sidebar = () => {
  const router = useRouter();
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/organizer/dashboard' },
    { icon: Calendar, label: 'Sự kiện của tôi', href: '/organizer/events' },
    { icon: PlusCircle, label: 'Tạo sự kiện', href: '/organizer/create-event' },
    { icon: Package, label: 'Quản lý đơn hàng', href: '/organizer/orders', active: true },
    { icon: QrCode, label: 'Check-in', href: '/organizer/checkin' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userData');
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-slate-900 min-h-screen fixed left-0 top-0 z-40">
      <div className="p-6 border-b border-slate-800">
        <Link href="/" className="flex items-center gap-2">
          <Ticket className="h-8 w-8 text-violet-400" />
          <div>
            <span className="text-xl font-bold text-white">TicketHub</span>
            <p className="text-xs text-slate-400">Organizer Portal</p>
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
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30' 
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

// Order Row
interface OrderRowProps {
  order: OrderWithTicketsResponse;
  onViewTickets: () => void;
}

const OrderRow = ({ order, onViewTickets }: OrderRowProps) => (
  <div className="p-4 hover:bg-slate-50 rounded-xl transition-colors border border-slate-100 bg-white">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
          <Package className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <p className="font-bold text-slate-900">#{order.orderId}</p>
          <p className="text-sm text-slate-500">{formatDate(order.createdAt)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`px-3 py-1 rounded-full text-xs font-bold
          ${order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 
            order.paymentStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
          {order.paymentStatus === 'PAID' ? 'Đã thanh toán' : 
           order.paymentStatus === 'PENDING' ? 'Chờ thanh toán' : 'Đã hủy'}
        </span>
      </div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
      <div>
        <p className="text-xs text-slate-500">Khách hàng</p>
        <p className="font-medium text-slate-900">{order.buyerInfo.name}</p>
        <p className="text-xs text-slate-500">{order.buyerInfo.email}</p>
      </div>
      <div>
        <p className="text-xs text-slate-500">Sự kiện</p>
        <p className="font-medium text-slate-900 truncate">{order.eventName}</p>
      </div>
      <div>
        <p className="text-xs text-slate-500">Số vé</p>
        <p className="font-medium text-slate-900">{order.tickets.length} vé</p>
      </div>
      <div>
        <p className="text-xs text-slate-500">Tổng tiền</p>
        <p className="font-bold text-violet-600">{formatCurrency(order.totalPrice)}</p>
      </div>
    </div>

    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
      <Button variant="outline" size="sm" className="rounded-lg" onClick={onViewTickets}>
        <Eye className="w-4 h-4 mr-1" />
        Xem vé
      </Button>
      <Button variant="outline" size="sm" className="rounded-lg">
        <Mail className="w-4 h-4 mr-1" />
        Gửi lại vé
      </Button>
      <Button variant="outline" size="sm" className="rounded-lg">
        <Printer className="w-4 h-4 mr-1" />
        In vé
      </Button>
    </div>
  </div>
);

// Ticket Detail Modal for Organizer
interface TicketModalProps {
  tickets: TicketResponse[];
  order: OrderWithTicketsResponse;
  onClose: () => void;
}

const TicketModal = ({ tickets, order, onClose }: TicketModalProps) => {
  const [selectedTicket, setSelectedTicket] = useState<TicketResponse>(tickets[0]);

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
      alert('Không thể tải QR Code.');
    }
  };

  const handleResendEmail = async () => {
    try {
      await ticketService.resendTicketEmail(selectedTicket.id);
      alert('Đã gửi lại vé đến email khách hàng!');
    } catch (error) {
      console.error('Error resending email:', error);
      alert('Không thể gửi email.');
    }
  };

  const qrImageSrc = selectedTicket.qrCodeDataUri || 
    (selectedTicket.qrCodeBase64 ? ticketService.createDataUri(selectedTicket.qrCodeBase64) : null);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-bold text-slate-900">Đơn hàng #{order.orderId}</h2>
              <p className="text-sm text-slate-500">{order.buyerInfo.name} - {order.buyerInfo.email}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* Tickets List */}
          <div>
            <h3 className="font-bold text-slate-900 mb-4">Danh sách vé ({tickets.length})</h3>
            <div className="space-y-2">
              {tickets.map((ticket, index) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all
                    ${selectedTicket.id === ticket.id 
                      ? 'border-violet-500 bg-violet-50' 
                      : 'border-slate-100 hover:border-slate-200'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold
                        ${selectedTicket.id === ticket.id ? 'bg-violet-600' : 'bg-slate-400'}`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{ticket.ticketType}</p>
                        <p className="text-xs text-slate-500 font-mono">{ticket.ticketCode}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold
                      ${ticket.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                        ticket.status === 'USED' ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-700'}`}>
                      {ticket.status === 'ACTIVE' ? 'OK' : ticket.status === 'USED' ? 'Đã dùng' : 'Hết hạn'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Ticket QR */}
          <div className="bg-slate-50 rounded-2xl p-6">
            <h3 className="font-bold text-slate-900 mb-4 text-center">Mã QR - {selectedTicket.ticketType}</h3>
            
            {/* QR Code Display */}
            <div className="bg-white p-6 rounded-2xl shadow-inner flex flex-col items-center">
              {qrImageSrc ? (
                <img 
                  src={qrImageSrc} 
                  alt={`QR Code - ${selectedTicket.ticketCode}`}
                  className="w-48 h-48 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <div className="w-48 h-48 bg-slate-100 rounded-xl flex items-center justify-center">
                  <QrCode className="w-20 h-20 text-slate-300" />
                </div>
              )}
              
              {/* Ticket Code */}
              <div className="mt-4 text-center w-full">
                <p className="text-xs text-slate-500 mb-1">Mã vé</p>
                <div className="bg-slate-100 rounded-lg px-3 py-2 font-mono text-sm font-bold text-slate-900">
                  {selectedTicket.ticketCode}
                </div>
              </div>
            </div>

            {/* Ticket Info */}
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Trạng thái</span>
                <span className={`font-medium
                  ${selectedTicket.status === 'ACTIVE' ? 'text-green-600' : 
                    selectedTicket.status === 'USED' ? 'text-slate-600' : 'text-red-600'}`}>
                  {selectedTicket.status === 'ACTIVE' ? 'Còn hiệu lực' : 
                   selectedTicket.status === 'USED' ? 'Đã sử dụng' : 'Hết hạn'}
                </span>
              </div>
              {selectedTicket.checkedInAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Check-in lúc</span>
                  <span className="font-medium text-slate-900">
                    {formatDate(selectedTicket.checkedInAt)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Giá vé</span>
                <span className="font-medium text-violet-600">{formatCurrency(selectedTicket.price)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-2">
              <Button 
                className="w-full rounded-xl bg-violet-600 hover:bg-violet-700"
                onClick={() => handleDownloadQR(selectedTicket.ticketCode)}
              >
                <Download className="w-4 h-4 mr-2" />
                Tải QR Code
              </Button>
              <Button 
                variant="outline" 
                className="w-full rounded-xl"
                onClick={handleResendEmail}
              >
                <Mail className="w-4 h-4 mr-2" />
                Gửi lại email
              </Button>
              <Button 
                variant="outline" 
                className="w-full rounded-xl"
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4 mr-2" />
                In vé này
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---
export default function OrdersManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventIdParam = searchParams.get('eventId');

  const [orders, setOrders] = useState<OrderWithTicketsResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithTicketsResponse | null>(null);

  // Check auth
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login?redirect=/organizer/orders');
    }
  }, [router]);

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        if (eventIdParam) {
          const data = await ticketService.getEventOrders(eventIdParam);
          setOrders(data);
        } else {
          // Get all orders for organizer
          const data = await ticketService.getAllOrganizerOrders();
          setOrders(data);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
        // Mock data for demo
        const mockOrders: OrderWithTicketsResponse[] = [
          {
            orderId: 'order-1001-abc-def',
            eventId: 'event-001-concert-mytam',
            eventName: 'Concert Mỹ Tâm - Live in Hanoi',
            eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            eventLocation: 'Hà Nội',
            totalPrice: 4000000,
            status: 'COMPLETED',
            paymentStatus: 'PAID',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            buyerInfo: { name: 'Nguyễn Văn A', email: 'nguyenvana@email.com', phone: '0912345678' },
            tickets: [
              { id: 'ticket-001', ticketCode: 'TH-ABC123-001', orderId: 'order-1001-abc-def', eventId: 'event-001-concert-mytam', eventName: 'Concert Mỹ Tâm', eventDate: '', eventLocation: 'Hà Nội', ticketType: 'VIP', price: 2000000, status: 'ACTIVE', createdAt: '' },
              { id: 'ticket-002', ticketCode: 'TH-ABC123-002', orderId: 'order-1001-abc-def', eventId: 'event-001-concert-mytam', eventName: 'Concert Mỹ Tâm', eventDate: '', eventLocation: 'Hà Nội', ticketType: 'VIP', price: 2000000, status: 'ACTIVE', createdAt: '' },
            ]
          },
          {
            orderId: 'order-1002-ghi-jkl',
            eventId: 'event-001-concert-mytam',
            eventName: 'Concert Mỹ Tâm - Live in Hanoi',
            eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            eventLocation: 'Hà Nội',
            totalPrice: 1500000,
            status: 'COMPLETED',
            paymentStatus: 'PAID',
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            buyerInfo: { name: 'Trần Thị B', email: 'tranthib@email.com', phone: '0987654321' },
            tickets: [
              { id: 'ticket-003', ticketCode: 'TH-DEF456-001', orderId: 'order-1002-ghi-jkl', eventId: 'event-001-concert-mytam', eventName: 'Concert Mỹ Tâm', eventDate: '', eventLocation: 'Hà Nội', ticketType: 'Premium', price: 1500000, status: 'USED', checkedInAt: new Date().toISOString(), createdAt: '' },
            ]
          }
        ];
        setOrders(mockOrders);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [eventIdParam]);

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.orderId.toString().includes(query) ||
      order.buyerInfo.name.toLowerCase().includes(query) ||
      order.buyerInfo.email.toLowerCase().includes(query) ||
      order.buyerInfo.phone.includes(query) ||
      order.tickets.some(t => t.ticketCode.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Quản lý đơn hàng</h1>
            <p className="text-slate-500">Xem và quản lý đơn hàng, gửi lại vé cho khách hàng</p>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6 border-0 shadow-lg rounded-2xl">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo mã đơn, tên, email, SĐT, mã vé..."
                  className="pl-12 h-12 rounded-xl"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <Card className="border-0 shadow-lg rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-violet-600" />
              Danh sách đơn hàng ({filteredOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
              </div>
            ) : filteredOrders.length > 0 ? (
              <div className="space-y-4">
                {filteredOrders.map(order => (
                  <OrderRow
                    key={order.orderId}
                    order={order}
                    onViewTickets={() => setSelectedOrder(order)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-2">Không có đơn hàng</h3>
                <p className="text-slate-500">
                  {searchQuery ? 'Không tìm thấy đơn hàng phù hợp' : 'Chưa có đơn hàng nào'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Ticket Modal */}
      {selectedOrder && (
        <TicketModal
          tickets={selectedOrder.tickets}
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}

