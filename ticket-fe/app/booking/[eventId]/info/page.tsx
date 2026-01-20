"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  Ticket, ChevronLeft, ChevronRight, Loader2, AlertCircle, 
  CheckCircle, User, Mail, Phone, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBookingSession } from "@/hooks/use-booking-session";
import { BookingCountdown } from "@/components/ui/booking-countdown";

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

// Form Input Component
interface FormInputProps {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  icon: React.ReactNode;
  required?: boolean;
}

const FormInput = ({ label, name, type = 'text', placeholder, value, onChange, error, icon, required }: FormInputProps) => (
  <div className="space-y-2">
    <Label htmlFor={name} className="text-sm font-medium text-slate-700 flex items-center gap-2">
      {icon}
      {label}
      {required && <span className="text-red-500">*</span>}
    </Label>
    <Input
      id={name}
      name={name}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`h-12 ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
    />
    {error && (
      <p className="text-sm text-red-500 flex items-center gap-1">
        <AlertCircle className="w-4 h-4" />
        {error}
      </p>
    )}
  </div>
);

// --- MAIN PAGE ---
export default function BuyerInfoPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [bookingData, setBookingData] = useState<any>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    note: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Booking session với countdown timer - tiếp tục từ trang trước
  const bookingSession = useBookingSession({
    eventId,
    autoRedirect: true,
    onExpired: () => {
      console.log("Session expired on info page");
    },
  });

  // Check auth & booking data
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push(`/login?redirect=/booking/${eventId}/info`);
      return;
    }

    const data = sessionStorage.getItem('bookingData');
    if (!data) {
      router.push(`/booking/${eventId}/tickets`);
      return;
    }
    
    const parsed = JSON.parse(data);
    setBookingData(parsed);
    
    // Pre-fill from user data if available
    const userData = localStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      setFormData(prev => ({
        ...prev,
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || ''
      }));
    }
    
    setIsLoading(false);
  }, [eventId, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ tên';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Họ tên phải có ít nhất 2 ký tự';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^(0|\+84)[0-9]{9,10}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (!validateForm()) return;

    sessionStorage.setItem('bookingData', JSON.stringify({
      ...bookingData,
      buyerInfo: formData
    }));
    
    router.push(`/booking/${eventId}/payment`);
  };

  // Calculate total
  const calculateTotal = () => {
    if (!bookingData?.ticketTypes) return 0;
    
    return bookingData.ticketTypes.reduce((sum: number, ticket: any) => {
      const qty = bookingData.selectedTickets[ticket.id] || 0;
      return sum + (ticket.price * qty);
    }, 0);
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <button 
              onClick={() => router.back()} 
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
          <BookingSteps currentStep={3} />
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                Thông tin người mua
              </h1>
              <p className="text-slate-500">
                Vé điện tử sẽ được gửi đến email của bạn
              </p>
            </div>

            <Card className="border-0 shadow-lg rounded-3xl">
              <CardContent className="p-6 md:p-8 space-y-6">
                <FormInput
                  label="Họ và tên"
                  name="fullName"
                  placeholder="Nhập họ và tên đầy đủ"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  error={errors.fullName}
                  icon={<User className="w-4 h-4 text-slate-400" />}
                  required
                />

                <FormInput
                  label="Email"
                  name="email"
                  type="email"
                  placeholder="example@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  error={errors.email}
                  icon={<Mail className="w-4 h-4 text-slate-400" />}
                  required
                />

                <FormInput
                  label="Số điện thoại"
                  name="phone"
                  type="tel"
                  placeholder="0912 345 678"
                  value={formData.phone}
                  onChange={handleInputChange}
                  error={errors.phone}
                  icon={<Phone className="w-4 h-4 text-slate-400" />}
                  required
                />

                <div className="space-y-2">
                  <Label htmlFor="note" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    Ghi chú (tùy chọn)
                  </Label>
                  <Input
                    id="note"
                    name="note"
                    placeholder="Nhập ghi chú nếu có..."
                    value={formData.note}
                    onChange={handleInputChange}
                    className="h-12"
                  />
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Thông tin quan trọng</p>
                      <ul className="mt-2 space-y-1 text-blue-600">
                        <li>• Vé điện tử sẽ được gửi đến email sau khi thanh toán thành công</li>
                        <li>• Vui lòng kiểm tra kỹ thông tin trước khi tiếp tục</li>
                        <li>• Mỗi vé chỉ được sử dụng một lần</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 border-0 shadow-xl rounded-3xl overflow-hidden">
              <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white">
                <h3 className="text-lg font-bold">Tóm tắt đơn hàng</h3>
              </div>

              <CardContent className="p-6 space-y-4">
                {/* Tickets */}
                {bookingData?.ticketTypes?.map((ticket: any) => {
                  const qty = bookingData.selectedTickets[ticket.id] || 0;
                  if (qty === 0) return null;
                  
                  return (
                    <div key={ticket.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-slate-900">{ticket.name}</p>
                        <p className="text-sm text-slate-500">{qty} x {formatCurrency(ticket.price)}</p>
                      </div>
                      <p className="font-bold text-slate-900">
                        {formatCurrency(ticket.price * qty)}
                      </p>
                    </div>
                  );
                })}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Tổng cộng</span>
                    <span className="text-2xl font-black text-violet-600">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                </div>

                {/* Buyer Info Preview */}
                {formData.fullName && (
                  <div className="border-t pt-4 space-y-2">
                    <p className="text-sm font-medium text-slate-500">Người mua</p>
                    <div className="bg-slate-50 rounded-xl p-3 space-y-1">
                      <p className="font-medium text-slate-900">{formData.fullName}</p>
                      {formData.email && <p className="text-sm text-slate-500">{formData.email}</p>}
                      {formData.phone && <p className="text-sm text-slate-500">{formData.phone}</p>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-4 z-50">
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="hidden sm:block">
            <p className="text-sm text-slate-500">Tổng thanh toán</p>
            <p className="text-xl font-bold text-violet-600">{formatCurrency(calculateTotal())}</p>
          </div>
          <div className="flex items-center gap-3 flex-1 sm:flex-none">
            <Button 
              variant="outline" 
              onClick={() => router.back()}
              className="flex-1 sm:flex-none"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>
            <Button 
              onClick={handleContinue}
              className="flex-1 sm:flex-none bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
            >
              Tiếp tục thanh toán
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

