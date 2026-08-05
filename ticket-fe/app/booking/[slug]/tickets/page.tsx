"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Ticket, ChevronLeft, ChevronRight, Loader2, AlertCircle, 
  CheckCircle, Minus, Plus, Clock, Info, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import eventService, { EventResponse } from "@/apis/event.service";
import ticketService, { TicketTypeResponse } from "@/apis/ticket.service";
import { orderService } from "@/apis/order.service";
import { useBookingSession } from "@/hooks/use-booking-session";
import { BookingCountdown } from "@/components/ui/booking-countdown";
import { useAutoCancelOrder, setCurrentOrderId, clearCurrentOrderId, getCurrentOrderId } from "@/hooks/use-auto-cancel-order";
import { useBookingNavigation } from "@/components/providers/BookingNavigationContext";

// --- TYPES ---

interface TicketType {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  available: number;
  maxPerOrder: number;
  benefits: string[];
  color: string;
  popular?: boolean;
}

// Color palette for ticket types based on name
const getTicketTypeColor = (name: string, index: number): string => {
  
  // Default colors based on index
  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600',
    'from-slate-600 to-slate-700',
  ];
  return colors[index % colors.length];
};

// Transform API response to frontend TicketType format
const transformTicketType = (apiType: TicketTypeResponse, index: number): TicketType => {
  const benefits: string[] = [];
  
  // Generate benefits based on ticket type name and zone
  if (apiType.zoneName) benefits.push(`Khu vực: ${apiType.zoneName}`);
  if (apiType.zoneDescription) benefits.push(apiType.zoneDescription);
  if (apiType.seatingType === 'FULL_SEAT') benefits.push('Ghế ngồi riêng');
  if (apiType.seatingType === 'ZONE_WITH_ROW') benefits.push('Có số hàng');
  if (!benefits.length) benefits.push('Vào cửa sự kiện');
  
  return {
    id: apiType.id.toString(),
    name: apiType.name,
    description: apiType.description || `Loại vé ${apiType.name}`,
    price: apiType.price,
    available: apiType.availableQuantity,
    maxPerOrder: Math.min(10, apiType.availableQuantity), // Max 10 tickets per order
    benefits,
    color: apiType.colorCode || getTicketTypeColor(apiType.name, index),
    popular: index === 0 && apiType.availableQuantity > 0, // Mark first available as popular
  };
};

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

// Progress Steps
const BookingSteps = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { id: 1, name: 'Chọn vé', icon: Ticket },
    { id: 2, name: 'Thông tin', icon: () => <span className="text-sm font-bold">📝</span> },
    { id: 3, name: 'Thanh toán', icon: () => <span className="text-sm font-bold">💳</span> },
    { id: 4, name: 'Hoàn tất', icon: CheckCircle },
  ];

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between max-w-3xl mx-auto px-4">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all
                ${currentStep >= step.id 
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' 
                  : 'bg-slate-100 text-slate-400'}`}
              >
                {currentStep > step.id ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </div>
              <span className={`text-xs mt-2 font-medium hidden sm:block
                ${currentStep >= step.id ? 'text-violet-600' : 'text-slate-400'}`}>
                {step.name}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-2 rounded-full transition-all
                ${currentStep > step.id ? 'bg-violet-600' : 'bg-slate-200'}`} 
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// Ticket Type Card
interface TicketCardProps {
  ticket: TicketType;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
}

const TicketCard = ({ ticket, quantity, onQuantityChange }: TicketCardProps) => {
  const isSelected = quantity > 0;
  const isSoldOut = ticket.available === 0;

  return (
    <Card className={`relative overflow-hidden transition-all duration-300 ${
      isSelected 
        ? 'ring-2 ring-violet-500 shadow-xl shadow-violet-100' 
        : 'hover:shadow-lg'
    } ${isSoldOut ? 'opacity-60' : ''}`}>
      {/* Popular Badge */}
      {ticket.popular && (
        <div className="absolute top-0 right-0">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
            Phổ biến
          </div>
        </div>
      )}

      {/* Sold Out Overlay */}
      {isSoldOut && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
          <span className="bg-red-500 text-white px-4 py-2 rounded-full font-bold">Hết vé</span>
        </div>
      )}

      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Ticket Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ticket.color} flex items-center justify-center shadow-lg`}>
                <Ticket className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{ticket.name}</h3>
                <p className="text-sm text-slate-500">{ticket.description}</p>
              </div>
            </div>

            {/* Benefits */}
            <div className="flex flex-wrap gap-2 mt-3">
              {ticket.benefits.map((benefit, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  {benefit}
                </span>
              ))}
            </div>

            {/* Availability */}
            <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Còn {ticket.available} vé • Tối đa {ticket.maxPerOrder} vé/đơn
            </p>
          </div>

          {/* Price & Quantity */}
          <div className="flex flex-col items-end gap-3 min-w-[180px]">
            <div className="text-right">
              {ticket.originalPrice && (
                <p className="text-sm text-slate-400 line-through">
                  {formatCurrency(ticket.originalPrice)}
                </p>
              )}
              <p className="text-2xl font-black text-violet-600">
                {formatCurrency(ticket.price)}
              </p>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => onQuantityChange(Math.max(0, quantity - 1))}
                disabled={quantity === 0 || isSoldOut}
                className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-slate-600 hover:bg-violet-50 hover:text-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center text-lg font-bold text-slate-900">
                {quantity}
              </span>
              <button
                onClick={() => onQuantityChange(Math.min(ticket.maxPerOrder, Math.min(ticket.available, quantity + 1)))}
                disabled={quantity >= ticket.maxPerOrder || quantity >= ticket.available || isSoldOut}
                className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-slate-600 hover:bg-violet-50 hover:text-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Order Summary
interface OrderSummaryProps {
  event: EventResponse;
  selectedTickets: { [key: string]: number };
  ticketTypes: TicketType[];
}

const OrderSummary = ({ event, selectedTickets, ticketTypes }: OrderSummaryProps) => {
  const items = Object.entries(selectedTickets)
    .filter(([_, qty]) => qty > 0)
    .map(([ticketId, qty]) => {
      const ticket = ticketTypes.find(t => t.id === ticketId);
      return ticket ? { ticket, quantity: qty } : null;
    })
    .filter(Boolean) as { ticket: TicketType; quantity: number }[];

  const subtotal = items.reduce((sum, item) => sum + item.ticket.price * item.quantity, 0);
  const totalTickets = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Card className="sticky top-24 border-0 shadow-xl rounded-3xl overflow-hidden">
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white">
        <h3 className="text-lg font-bold">Đơn hàng của bạn</h3>
        <p className="text-violet-200 text-sm mt-1">{event.name}</p>
      </div>

      <CardContent className="p-6 space-y-4">
        {/* Event Info */}
        <div className="flex items-center gap-2 text-sm text-slate-500 pb-4 border-b">
          <Clock className="w-4 h-4" />
          <span>{formatDate(event.eventDate)}</span>
        </div>

        {/* Selected Tickets */}
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map(({ ticket, quantity }) => (
              <div key={ticket.id} className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-slate-900">{ticket.name}</p>
                  <p className="text-sm text-slate-500">{quantity} x {formatCurrency(ticket.price)}</p>
                </div>
                <p className="font-bold text-slate-900">
                  {formatCurrency(ticket.price * quantity)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <Ticket className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Chưa chọn vé nào</p>
          </div>
        )}

        {/* Total */}
        {items.length > 0 && (
          <>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Tổng ({totalTickets} vé)</span>
                <span className="text-2xl font-black text-violet-600">
                  {formatCurrency(subtotal)}
                </span>
              </div>
            </div>

          </>
        )}
      </CardContent>
    </Card>
  );
};

// --- MAIN PAGE ---
export default function TicketSelectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  const [event, setEvent] = useState<EventResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<{ [key: string]: number }>({});
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  // Hook tự động hủy đơn hàng khi rời khỏi luồng đặt vé (beforeunload, pagehide)
  useAutoCancelOrder();
  
  // Hook để navigate an toàn với popup xác nhận
  const { safeNavigate } = useBookingNavigation();

  /**
   * LOGIC "CLEAN-UP ON ENTRY"
   * Khi vào trang chọn vé, kiểm tra xem có đơn hàng cũ không.
   * Nếu có -> Hủy đơn cũ (trả vé) -> Xóa session
   * Điều này đảm bảo vé không bị giữ ảo khi user quay lại từ đầu
   */
  useEffect(() => {
    const cleanupOldOrder = async () => {
      const oldOrderId = getCurrentOrderId();
      if (oldOrderId) {
        console.log('🧹 Clean-up: Hủy đơn hàng cũ:', oldOrderId);
        try {
          await orderService.cancelOrder(oldOrderId);
          console.log('✅ Đã hủy đơn hàng cũ thành công');
        } catch (err) {
          console.warn('⚠️ Không thể hủy đơn cũ (có thể đã hết hạn):', err);
        } finally {
          // Luôn xóa session dù API thành công hay thất bại
          clearCurrentOrderId();
          sessionStorage.removeItem('bookingData');
        }
      }
    };
    
    cleanupOldOrder();
  }, []); // Chạy 1 lần khi component mount

  // Booking session với countdown timer - bắt đầu ngay khi vào trang
  const bookingSession = useBookingSession({
    eventId: slug, // Using slug for redirect
    autoRedirect: true,
    onExpired: () => {
      console.log("Session expired on tickets page");
    },
  });

  // Check auth (in real app, use auth context)
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push(`/login?redirect=/booking/${slug}/tickets`);
    }
  }, [slug, router]);

  // Bắt đầu booking session khi component mount
  useEffect(() => {
    if (!bookingSession.isActive && !bookingSession.isExpired) {
      bookingSession.startSession();
    }
  }, [bookingSession]);

  // Fetch event and ticket types
  useEffect(() => {
    const fetchEventAndTicketTypes = async () => {
      if (!slug) return;
      
      try {
        setIsLoading(true);
        
        // 1. Fetch event by slug first
        const eventData = await eventService.getEventBySlug(slug);
        setEvent(eventData);

        // 2. Fetch ticket types using event ID
        if (eventData && eventData.id) {
            const ticketTypesData = await ticketService.getAvailableTicketTypes(eventData.id);
            
            // Transform API ticket types to frontend format
            if (ticketTypesData && ticketTypesData.length > 0) {
              const transformedTypes = ticketTypesData.map((type, index) => 
                transformTicketType(type, index)
              );
              setTicketTypes(transformedTypes);
            } else {
              setTicketTypes([]);
            }
        }
      } catch (err) {
        console.error("Error fetching event or ticket types:", err);
        setError("Không thể tải thông tin sự kiện");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventAndTicketTypes();
  }, [slug]);

  const handleQuantityChange = (ticketId: string, quantity: number) => {
    setSelectedTickets(prev => ({
      ...prev,
      [ticketId]: quantity
    }));
  };

  const totalTickets = Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  const canProceed = totalTickets > 0 && !isCreatingOrder;

  /**
   * HANDLE CONTINUE - TẠO ĐƠN HÀNG SỚM
   * Theo kiến trúc Final Architecture:
   * - Tạo đơn hàng ngay khi bấm "Tiếp tục" (không đợi đến trang Payment)
   * - Vé được trừ khỏi tồn kho ngay lập tức
   * - orderId được lưu vào sessionStorage để hook auto-cancel hoạt động
   */
  const handleContinue = async () => {
    if (isCreatingOrder || !event) return;
    
    setIsCreatingOrder(true);
    
    try {
      // Build booking data with selected tickets
      const selectedTicketTypes = ticketTypes
        .filter(t => selectedTickets[t.id] > 0)
        .map(t => ({
          ticketTypeId: t.id,
          name: t.name,
          price: t.price,
          quantity: selectedTickets[t.id]
        }));
      
      const totalAmount = selectedTicketTypes.reduce(
        (sum, t) => sum + (t.price * t.quantity), 
        0
      );
      const totalQuantity = selectedTicketTypes.reduce(
        (sum, t) => sum + t.quantity, 
        0
      );

      console.log('🚀 Đang tạo đơn hàng với', totalQuantity, 'vé...');
      
      // GỌI API INIT ĐỂ TẠO ĐƠN HÀNG
      const { orderId, expiredAt } = await orderService.initOrder(
        event.id, 
        totalQuantity
      );
      
      console.log('✅ Đã tạo đơn hàng:', orderId);
      
      // LƯU ORDER ID VÀO SESSION STORAGE
      // Hook useAutoCancelOrder sẽ sử dụng ID này để hủy đơn khi user rời trang
      setCurrentOrderId(orderId);
      
      // Lưu dữ liệu booking
      sessionStorage.setItem('bookingData', JSON.stringify({
        eventId: event.id,
        eventSlug: slug,
        eventName: event.name,
        eventDate: event.eventDate,
        selectedTickets,
        ticketTypes: selectedTicketTypes,
        totalAmount,
        totalQuantity,
        orderId,      // Lưu orderId vào bookingData
        expiredAt,    // Lưu thời gian hết hạn
      }));
      
      // Chuyển sang trang info
      router.push(`/booking/${slug}/info`);
      
    } catch (err: any) {
      console.error('❌ Lỗi khi tạo đơn hàng:', err);
      setError(err.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.');
      setIsCreatingOrder(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-slate-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-900 font-bold mb-2">Đã có lỗi xảy ra</p>
          <p className="text-slate-500 mb-4">{error}</p>
          <Link href="/">
            <Button>Về trang chủ</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <button 
              onClick={() => safeNavigate(`/events/${slug}`)}
              className="flex items-center gap-2 text-slate-600 hover:text-violet-600"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">Quay lại</span>
            </button>
            <Link href="/" className="flex items-center gap-2">
              <Ticket className="h-6 w-6 text-violet-600" />
              <span className="text-xl font-bold text-slate-900">TicketHub</span>
            </Link>
            {/* Countdown Timer */}
            <BookingCountdown
              formattedTime={bookingSession.formattedTime}
              isActive={bookingSession.isActive}
              isUrgent={bookingSession.isUrgent}
              isWarning={bookingSession.isWarning}
            />
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="container mx-auto">
          <BookingSteps currentStep={1} />
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Ticket Selection */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                Chọn loại vé
              </h1>
              <p className="text-slate-500">
                Chọn loại vé và số lượng phù hợp với bạn
              </p>
            </div>

            {/* Ticket Types */}
            <div className="space-y-4">
              {ticketTypes.length > 0 ? (
                ticketTypes.map(ticket => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    quantity={selectedTickets[ticket.id] || 0}
                    onQuantityChange={(qty) => handleQuantityChange(ticket.id, qty)}
                  />
                ))
              ) : (
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-2">
                      Chưa có loại vé nào
                    </h3>
                    <p className="text-slate-500">
                      Sự kiện này chưa được cấu hình loại vé. Vui lòng liên hệ nhà tổ chức.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <OrderSummary 
              event={event} 
              selectedTickets={selectedTickets}
              ticketTypes={ticketTypes}
            />
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-4 z-50">
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="hidden sm:block">
            <p className="text-sm text-slate-500">Đã chọn</p>
            <p className="text-xl font-bold text-slate-900">{totalTickets} vé</p>
          </div>
          <div className="flex items-center gap-3 flex-1 sm:flex-none">
            <Button 
              variant="outline" 
              className="flex-1 sm:flex-none w-full sm:w-auto" 
              disabled={isCreatingOrder}
              onClick={() => safeNavigate(`/events/${slug}`)}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>
            <Button 
              onClick={handleContinue}
              disabled={!canProceed}
              className="flex-1 sm:flex-none bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
            >
              {isCreatingOrder ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  Tiếp tục
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}