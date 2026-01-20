"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { 
  Ticket, ChevronLeft, Loader2, AlertCircle, 
  CheckCircle, CreditCard, Smartphone, QrCode, Building, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { orderService, OrderStatusResponse } from "@/apis/order.service";
import { paymentService } from "@/apis/payment.service";
import { useBookingSession } from "@/hooks/use-booking-session";
import { BookingCountdown } from "@/components/ui/booking-countdown";

// --- TYPES ---

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  popular?: boolean;
}

// --- CONSTANTS ---

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'momo',
    name: 'Ví MoMo',
    description: 'Thanh toán qua ví điện tử MoMo',
    icon: <Smartphone className="w-6 h-6" />,
    color: 'from-pink-500 to-rose-500',
    popular: true
  },
  {
    id: 'vnpay',
    name: 'VNPay QR',
    description: 'Quét mã QR để thanh toán',
    icon: <QrCode className="w-6 h-6" />,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'card',
    name: 'Thẻ Visa/Mastercard',
    description: 'Thẻ tín dụng/ghi nợ quốc tế',
    icon: <CreditCard className="w-6 h-6" />,
    color: 'from-indigo-500 to-purple-500'
  },
  {
    id: 'atm',
    name: 'Thẻ ATM nội địa',
    description: 'Thẻ ngân hàng nội địa Việt Nam',
    icon: <Building className="w-6 h-6" />,
    color: 'from-emerald-500 to-teal-500'
  }
];

// --- UTILS ---

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// --- COMPONENTS ---

// Progress Steps
const BookingSteps = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { id: 1, name: 'Chọn vé' },
    { id: 2, name: 'Chọn ghế' },
    { id: 3, name: 'Thông tin' },
    { id: 4, name: 'Thanh toán' },
    { id: 5, name: 'Hoàn tất' },
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
                {currentStep > step.id ? <CheckCircle className="w-5 h-5" /> : step.id}
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

// Payment Method Card
interface PaymentMethodCardProps {
  method: PaymentMethod;
  isSelected: boolean;
  onSelect: () => void;
}

const PaymentMethodCard = ({ method, isSelected, onSelect }: PaymentMethodCardProps) => (
  <button
    onClick={onSelect}
    className={`w-full p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden
      ${isSelected 
        ? 'border-violet-500 bg-violet-50 shadow-lg' 
        : 'border-slate-200 hover:border-violet-300 hover:bg-slate-50'}`}
  >
    {method.popular && (
      <div className="absolute top-0 right-0">
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
          Phổ biến
        </div>
      </div>
    )}
    
    <div className="flex items-center gap-4">
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${method.color} flex items-center justify-center text-white shadow-lg`}>
        {method.icon}
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-slate-900">{method.name}</h3>
        <p className="text-sm text-slate-500">{method.description}</p>
      </div>
      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
        ${isSelected ? 'border-violet-600 bg-violet-600' : 'border-slate-300'}`}>
        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
      </div>
    </div>
  </button>
);

// --- MAIN PAGE ---
export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = params.eventId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('vnpay');
  const [orderStatus, setOrderStatus] = useState<OrderStatusResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Booking session với countdown timer - tiếp tục từ trang trước
  const bookingSession = useBookingSession({
    eventId,
    autoRedirect: true,
    onExpired: () => {
      setIsProcessing(false);
      setStatusMessage('');
    },
  });

  // Check auth & booking data
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push(`/login?redirect=/booking/${eventId}/payment`);
      return;
    }

    const data = sessionStorage.getItem('bookingData');
    if (!data) {
      router.push(`/booking/${eventId}/tickets`);
      return;
    }
    
    const parsed = JSON.parse(data);
    if (!parsed.buyerInfo) {
      router.push(`/booking/${eventId}/info`);
      return;
    }
    
    setBookingData(parsed);
    setIsLoading(false);
    
    // Check if returning from VNPay
    const vnpResponseCode = searchParams.get('vnp_ResponseCode');
    if (vnpResponseCode) {
      handleVNPayCallback();
    }
  }, [eventId, router, searchParams]);

  // Handle VNPay callback when user returns
  const handleVNPayCallback = async () => {
    const result = paymentService.parseCallbackResult(searchParams);
    
    if (result) {
      if (result.success) {
        // Extract orderId from txnRef (format: ORDER{uuid}_{timestamp})
        const txnRef = result.txnRef || '';
        const orderIdMatch = txnRef.match(/ORDER(.+?)_/);
        const orderId = orderIdMatch ? orderIdMatch[1] : '';
        
        // Save order data and redirect to confirmation
        const data = sessionStorage.getItem('bookingData');
        if (data) {
          sessionStorage.setItem('orderData', JSON.stringify({
            ...JSON.parse(data),
            paymentMethod: 'vnpay',
            paidAt: new Date().toISOString()
          }));
        }
        
        // End booking session - thanh toán thành công
        bookingSession.endSession();
        
        router.push(`/booking/${eventId}/confirmation?orderId=${orderId}`);
      } else {
        setStatusMessage(`Thanh toán thất bại: ${result.message}`);
        setIsProcessing(false);
      }
    }
  };

  // Calculate total
  const calculateTotal = () => {
    if (!bookingData?.ticketTypes) return 0;
    
    return bookingData.ticketTypes.reduce((sum: number, ticket: any) => {
      const qty = bookingData.selectedTickets[ticket.id] || 0;
      return sum + (ticket.price * qty);
    }, 0);
  };

  // Get total quantity
  const getTotalQuantity = () => {
    if (!bookingData?.selectedTickets) return 0;
    return Object.values(bookingData.selectedTickets).reduce((sum: number, qty: any) => sum + qty, 0);
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    setStatusMessage('Đang tạo đơn hàng...');
    
    try {
      // 1. Create order through queue
      const totalQuantity = getTotalQuantity();
      const createResponse = await orderService.createOrder(eventId, totalQuantity as number);
      
      setOrderStatus(createResponse);
      console.log('📦 Order response:', createResponse);
      
      // 2. Poll for order confirmation
      setStatusMessage('Đang chờ xác nhận đơn hàng...');
      let confirmed = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max wait
      let finalOrderId = createResponse.orderId;
      
      while (!confirmed && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await orderService.checkOrderStatus(createResponse.requestId);
        console.log('📊 Status check:', statusResponse);
        
        if (statusResponse.status === 'SUCCESS' && statusResponse.orderId) {
          confirmed = true;
          finalOrderId = statusResponse.orderId;
          break;
        } else if (statusResponse.status === 'FAILED') {
          throw new Error(statusResponse.message || 'Đặt vé thất bại');
        }
        
        attempts++;
      }
      
      if (!confirmed || !finalOrderId) {
        throw new Error('Không thể xác nhận đơn hàng. Vui lòng thử lại.');
      }
      
      // 3. Create VNPay payment URL
      setStatusMessage('Đang tạo liên kết thanh toán...');
      const bankCode = paymentService.mapMethodToBankCode(selectedMethod);
      
      const paymentResponse = await paymentService.createPayment({
        orderId: finalOrderId,
        bankCode,
        language: 'vn'
      });
      
      if (paymentResponse.code !== '00' || !paymentResponse.paymentUrl) {
        throw new Error(paymentResponse.message || 'Không thể tạo liên kết thanh toán');
      }
      
      // 4. Save booking data for later (after VNPay redirect back)
      sessionStorage.setItem('bookingData', JSON.stringify({
        ...bookingData,
        orderId: finalOrderId
      }));
      
      // 5. Redirect to VNPay
      setStatusMessage('Đang chuyển đến cổng thanh toán...');
      paymentService.redirectToPayment(paymentResponse.paymentUrl);
      
    } catch (error: any) {
      console.error('Payment error:', error);
      setStatusMessage(`Lỗi: ${error.message || 'Có lỗi xảy ra trong quá trình thanh toán'}`);
      setIsProcessing(false);
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

  const total = calculateTotal();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <button 
              onClick={() => router.back()} 
              className="flex items-center gap-2 text-slate-600 hover:text-violet-600"
              disabled={isProcessing}
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
          <BookingSteps currentStep={4} />
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Methods */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                Chọn phương thức thanh toán
              </h1>
              <p className="text-slate-500">
                Chọn phương thức thanh toán phù hợp với bạn
              </p>
            </div>

            <div className="space-y-3">
              {PAYMENT_METHODS.map(method => (
                <PaymentMethodCard
                  key={method.id}
                  method={method}
                  isSelected={selectedMethod === method.id}
                  onSelect={() => setSelectedMethod(method.id)}
                />
              ))}
            </div>

            {/* Security Info */}
            <Card className="border-0 shadow-lg rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Thanh toán an toàn & bảo mật</h3>
                    <ul className="space-y-2 text-slate-300 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Mã hóa SSL 256-bit
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Không lưu trữ thông tin thẻ
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Xác thực 2 lớp
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 border-0 shadow-xl rounded-3xl overflow-hidden">
              <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white">
                <h3 className="text-lg font-bold">Chi tiết thanh toán</h3>
              </div>

              <CardContent className="p-6 space-y-4">
                {/* Buyer Info */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-500">Người mua</p>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="font-medium text-slate-900">{bookingData?.buyerInfo?.fullName}</p>
                    <p className="text-sm text-slate-500">{bookingData?.buyerInfo?.email}</p>
                    <p className="text-sm text-slate-500">{bookingData?.buyerInfo?.phone}</p>
                  </div>
                </div>

                {/* Tickets */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-500">Vé đã chọn</p>
                  {bookingData?.ticketTypes?.map((ticket: any) => {
                    const qty = bookingData.selectedTickets[ticket.id] || 0;
                    if (qty === 0) return null;
                    
                    return (
                      <div key={ticket.id} className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">{ticket.name} x {qty}</span>
                        <span className="font-medium text-slate-900">
                          {formatCurrency(ticket.price * qty)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-600">Tạm tính</span>
                    <span className="font-medium text-slate-900">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-600">Phí dịch vụ</span>
                    <span className="font-medium text-green-600">Miễn phí</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-bold text-slate-900">Tổng cộng</span>
                    <span className="text-2xl font-black text-violet-600">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                {/* Status Message */}
                {statusMessage && (
                  <div className={`p-3 rounded-xl text-sm text-center ${
                    statusMessage.includes('Lỗi') || statusMessage.includes('thất bại')
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {statusMessage}
                  </div>
                )}

                {/* Payment Button */}
                <Button 
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="w-full h-14 text-lg font-bold rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {statusMessage || 'Đang xử lý...'}
                    </>
                  ) : (
                    <>
                      Thanh toán {formatCurrency(total)}
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-slate-400">
                  Bằng việc thanh toán, bạn đồng ý với{' '}
                  <a href="#" className="text-violet-600 hover:underline">Điều khoản dịch vụ</a>
                  {' '}và{' '}
                  <a href="#" className="text-violet-600 hover:underline">Chính sách bảo mật</a>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

