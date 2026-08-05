"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Ticket, ChevronLeft, ChevronRight, Loader2, AlertCircle, 
  CheckCircle, Info, ZoomIn, ZoomOut, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// --- TYPES ---

interface Seat {
  id: string;
  row: string;
  number: number;
  status: 'available' | 'selected' | 'reserved' | 'sold';
  price: number;
  category: 'vip' | 'premium' | 'standard';
}

interface SeatCategory {
  id: string;
  name: string;
  color: string;
  price: number;
}

// --- MOCK DATA ---

const SEAT_CATEGORIES: SeatCategory[] = [
  { id: 'vip', name: 'VIP', color: '#f59e0b', price: 2000000 },
  { id: 'premium', name: 'Premium', color: '#8b5cf6', price: 1500000 },
  { id: 'standard', name: 'Standard', color: '#64748b', price: 800000 },
];

const generateSeats = (): Seat[] => {
  const seats: Seat[] = [];
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  
  rows.forEach((row, rowIndex) => {
    const seatsPerRow = rowIndex < 2 ? 10 : rowIndex < 5 ? 14 : 16;
    const category = rowIndex < 2 ? 'vip' : rowIndex < 5 ? 'premium' : 'standard';
    const categoryData = SEAT_CATEGORIES.find(c => c.id === category)!;
    
    for (let i = 1; i <= seatsPerRow; i++) {
      const random = Math.random();
      let status: Seat['status'] = 'available';
      if (random < 0.2) status = 'sold';
      else if (random < 0.25) status = 'reserved';
      
      seats.push({
        id: `${row}${i}`,
        row,
        number: i,
        status,
        price: categoryData.price,
        category
      });
    }
  });
  
  return seats;
};

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

// Seat Component
interface SeatProps {
  seat: Seat;
  isSelected: boolean;
  onSelect: () => void;
}

const SeatComponent = ({ seat, isSelected, onSelect }: SeatProps) => {
  const category = SEAT_CATEGORIES.find(c => c.id === seat.category)!;
  
  const getStatusStyles = () => {
    if (seat.status === 'sold') return 'bg-slate-300 cursor-not-allowed';
    if (seat.status === 'reserved') return 'bg-orange-200 cursor-not-allowed';
    if (isSelected) return 'bg-violet-600 text-white ring-2 ring-violet-400 ring-offset-2';
    return `hover:opacity-80 cursor-pointer`;
  };

  const isDisabled = seat.status === 'sold' || seat.status === 'reserved';

  return (
    <button
      onClick={onSelect}
      disabled={isDisabled}
      title={isDisabled ? (seat.status === 'sold' ? 'Đã bán' : 'Đang giữ') : `${seat.row}${seat.number} - ${formatCurrency(seat.price)}`}
      className={`w-7 h-7 md:w-8 md:h-8 rounded-t-lg text-[10px] md:text-xs font-bold transition-all ${getStatusStyles()}`}
      style={{ 
        backgroundColor: isSelected ? undefined : (isDisabled ? undefined : category.color),
        color: isSelected ? 'white' : (isDisabled ? undefined : 'white')
      }}
    >
      {seat.number}
    </button>
  );
};

// Seat Map Legend
const SeatLegend = () => (
  <div className="flex flex-wrap items-center justify-center gap-4 p-4 bg-slate-50 rounded-xl">
    {SEAT_CATEGORIES.map(cat => (
      <div key={cat.id} className="flex items-center gap-2">
        <div 
          className="w-6 h-6 rounded-t-lg" 
          style={{ backgroundColor: cat.color }}
        />
        <span className="text-sm text-slate-600">{cat.name}</span>
      </div>
    ))}
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-t-lg bg-violet-600 ring-2 ring-violet-400 ring-offset-1" />
      <span className="text-sm text-slate-600">Đang chọn</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-t-lg bg-orange-200" />
      <span className="text-sm text-slate-600">Đang giữ</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-t-lg bg-slate-300" />
      <span className="text-sm text-slate-600">Đã bán</span>
    </div>
  </div>
);

// --- MAIN PAGE ---
export default function SeatSelectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [bookingData, setBookingData] = useState<any>(null);

  // Check auth & booking data
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push(`/login?redirect=/booking/${slug}/seats`);
      return;
    }

    const data = sessionStorage.getItem('bookingData');
    if (!data) {
      router.push(`/booking/${slug}/tickets`);
      return;
    }
    setBookingData(JSON.parse(data));
  }, [slug, router]);

  // Load seats
  useEffect(() => {
    const loadSeats = async () => {
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSeats(generateSeats());
      setIsLoading(false);
    };

    loadSeats();
  }, []);

  const handleSeatSelect = (seatId: string) => {
    const seat = seats.find(s => s.id === seatId);
    if (!seat || seat.status !== 'available') return;

    setSelectedSeats(prev => {
      if (prev.includes(seatId)) {
        return prev.filter(id => id !== seatId);
      }
      // Limit selection based on ticket count
      const maxSeats = bookingData?.selectedTickets 
        ? Object.values(bookingData.selectedTickets).reduce((a: number, b: any) => a + b, 0) as number
        : 10;
      if (prev.length >= maxSeats) {
        return prev;
      }
      return [...prev, seatId];
    });
  };

  const handleContinue = () => {
    sessionStorage.setItem('bookingData', JSON.stringify({
      ...bookingData,
      selectedSeats
    }));
    router.push(`/booking/${slug}/info`);
  };

  const selectedSeatsData = seats.filter(s => selectedSeats.includes(s.id));
  const totalPrice = selectedSeatsData.reduce((sum, s) => sum + s.price, 0);

  // Group seats by row
  const seatsByRow = seats.reduce((acc, seat) => {
    if (!acc[seat.row]) acc[seat.row] = [];
    acc[seat.row].push(seat);
    return acc;
  }, {} as { [key: string]: Seat[] });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-slate-500">Đang tải sơ đồ ghế...</p>
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
            <Link href={`/booking/${slug}/tickets`} className="flex items-center gap-2 text-slate-600 hover:text-violet-600">
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">Quay lại</span>
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <Ticket className="h-6 w-6 text-violet-600" />
              <span className="text-xl font-bold text-slate-900">TicketHub</span>
            </Link>
            <div className="w-24" />
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="container mx-auto">
          <BookingSteps currentStep={2} />
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Seat Map */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                  Chọn ghế ngồi
                </h1>
                <p className="text-slate-500">
                  Chọn vị trí ghế yêu thích của bạn
                </p>
              </div>
              
              {/* Zoom Controls */}
              <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm border">
                <button 
                  onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setZoom(1)}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Legend */}
            <SeatLegend />

            {/* Seat Map */}
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                {/* Stage */}
                <div className="mb-8">
                  <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white text-center py-4 rounded-xl font-bold text-lg shadow-lg">
                    🎭 SÂN KHẤU
                  </div>
                </div>

                {/* Seats */}
                <div 
                  className="overflow-x-auto pb-4"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
                >
                  <div className="min-w-[500px] space-y-2">
                    {Object.entries(seatsByRow).map(([row, rowSeats]) => (
                      <div key={row} className="flex items-center justify-center gap-1">
                        <span className="w-8 text-center font-bold text-slate-400">{row}</span>
                        <div className="flex gap-1 justify-center">
                          {rowSeats.map((seat, idx) => (
                            <React.Fragment key={seat.id}>
                              {/* Aisle gap */}
                              {idx === Math.floor(rowSeats.length / 2) && (
                                <div className="w-6" />
                              )}
                              <SeatComponent
                                seat={seat}
                                isSelected={selectedSeats.includes(seat.id)}
                                onSelect={() => handleSeatSelect(seat.id)}
                              />
                            </React.Fragment>
                          ))}
                        </div>
                        <span className="w-8 text-center font-bold text-slate-400">{row}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info */}
                <div className="mt-6 p-4 bg-blue-50 rounded-xl flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Hướng dẫn chọn ghế</p>
                    <p className="mt-1 text-blue-600">
                      Click vào ghế để chọn hoặc bỏ chọn. Ghế màu cam đang được người khác giữ, 
                      ghế màu xám đã được bán.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Selected Seats Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 border-0 shadow-xl rounded-3xl overflow-hidden">
              <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white">
                <h3 className="text-lg font-bold">Ghế đã chọn</h3>
                <p className="text-violet-200 text-sm mt-1">{selectedSeats.length} ghế</p>
              </div>

              <CardContent className="p-6 space-y-4">
                {selectedSeatsData.length > 0 ? (
                  <>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedSeatsData.map(seat => {
                        const category = SEAT_CATEGORIES.find(c => c.id === seat.category)!;
                        return (
                          <div key={seat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                                style={{ backgroundColor: category.color }}
                              >
                                {seat.row}{seat.number}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{category.name}</p>
                                <p className="text-xs text-slate-500">Hàng {seat.row}, Ghế {seat.number}</p>
                              </div>
                            </div>
                            <p className="font-bold text-slate-900">{formatCurrency(seat.price)}</p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Tổng cộng</span>
                        <span className="text-2xl font-black text-violet-600">
                          {formatCurrency(totalPrice)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <div className="text-4xl mb-2">🪑</div>
                    <p>Chưa chọn ghế nào</p>
                    <p className="text-sm mt-1">Click vào ghế trên sơ đồ để chọn</p>
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
            <p className="text-sm text-slate-500">Đã chọn</p>
            <p className="text-xl font-bold text-slate-900">{selectedSeats.length} ghế</p>
          </div>
          <div className="flex items-center gap-3 flex-1 sm:flex-none">
            <Link href={`/booking/${slug}/tickets`} className="flex-1 sm:flex-none">
              <Button variant="outline" className="w-full sm:w-auto">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Quay lại
              </Button>
            </Link>
            <Button 
              onClick={handleContinue}
              disabled={selectedSeats.length === 0}
              className="flex-1 sm:flex-none bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
            >
              Tiếp tục
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
