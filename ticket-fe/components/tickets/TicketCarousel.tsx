"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  ChevronLeft, ChevronRight, Download, Calendar, MapPin, 
  Clock, QrCode, CheckCircle, User, Ticket as TicketIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ticketService, { TicketResponse } from "@/apis/ticket.service";

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

// --- SINGLE TICKET CARD ---

interface TicketCardProps {
  ticket: TicketResponse;
  index: number;
  total: number;
  onDownload?: (ticketCode: string) => void;
}

const TicketCard = ({ ticket, index, total, onDownload }: TicketCardProps) => {
  const qrImageSrc = ticket.qrCodeDataUri || 
    (ticket.qrCodeBase64 ? ticketService.createDataUri(ticket.qrCodeBase64) : null);

  const isUsed = ticket.status === 'USED';
  const isActive = ticket.status === 'ACTIVE';
  const isExpired = ticket.status === 'EXPIRED';
  const isCancelled = ticket.status === 'CANCELLED';

  return (
    <div className="w-full flex-shrink-0 px-2">
      <div className={`bg-white rounded-3xl shadow-2xl overflow-hidden border-2 transition-all
        ${isUsed ? 'border-blue-200 opacity-85' : 
          isExpired ? 'border-orange-200 opacity-75' :
          isCancelled ? 'border-red-200 opacity-60' : 'border-violet-100'}`}
      >
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between
          ${isUsed ? 'bg-blue-100' : 
            isExpired ? 'bg-orange-100' :
            isCancelled ? 'bg-red-100' : 'bg-gradient-to-r from-violet-600 to-purple-600'}`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg
              ${isUsed ? 'bg-blue-200 text-blue-600' : 
                isExpired ? 'bg-orange-200 text-orange-600' :
                isCancelled ? 'bg-red-200 text-red-600' : 'bg-white/20 text-white'}`}
            >
              {index + 1}/{total}
            </div>
            <div className={isUsed ? 'text-blue-700' : 
              isExpired ? 'text-orange-700' :
              isCancelled ? 'text-red-700' : 'text-white'}>
              <p className="font-bold">{ticket.ticketTypeName || ticket.ticketType || 'Vé'}</p>
              <p className="text-sm opacity-80">Vé #{index + 1}</p>
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold
            ${isActive ? 'bg-green-100 text-green-700' : 
              isUsed ? 'bg-blue-200 text-blue-700' : 
              isExpired ? 'bg-orange-200 text-orange-700' : 'bg-red-200 text-red-700'}`}
          >
            {isActive ? '✓ Còn hiệu lực' : 
             isUsed ? '✓ Đã check-in' : 
             isExpired ? '⏰ Đã hết hạn' : '✗ Đã hủy'}
          </span>
        </div>

        {/* QR Code Section */}
        <div className="p-6 bg-gradient-to-b from-slate-50 to-white flex flex-col items-center">
          {/* Large QR Code with high contrast background */}
          <div className={`bg-white p-6 rounded-3xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.08)] border-4 transition-all
            ${isUsed ? 'border-blue-200' : 
              isExpired || isCancelled ? 'border-slate-200 grayscale' : 'border-violet-100'}`}
          >
            {qrImageSrc ? (
              <img 
                src={qrImageSrc} 
                alt={`QR Code - Vé ${index + 1}`}
                className="w-52 h-52 object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div className="w-52 h-52 bg-slate-100 rounded-xl flex items-center justify-center">
                <QrCode className="w-20 h-20 text-slate-300" />
              </div>
            )}
          </div>

          {/* Ticket Code */}
          <div className="mt-6 text-center w-full">
            <p className="text-xs text-slate-500 mb-2">Mã vé (nhập tay nếu máy quét không đọc được)</p>
            <div className="bg-slate-100 rounded-xl px-4 py-3 font-mono text-base font-bold text-slate-900 break-all select-all">
              {ticket.ticketCode}
            </div>
          </div>
        </div>

        {/* Divider - Ticket tear style */}
        <div className="relative h-8 flex items-center">
          <div className="absolute left-0 w-5 h-10 bg-slate-100 rounded-r-full -translate-y-1" />
          <div className="flex-1 border-t-2 border-dashed border-slate-200 mx-6" />
          <div className="absolute right-0 w-5 h-10 bg-slate-100 rounded-l-full -translate-y-1" />
        </div>

        {/* Ticket Details */}
        <div className="px-6 pb-4 space-y-3">
          {/* Event Name */}
          <h3 className="text-lg font-bold text-slate-900">{ticket.eventName}</h3>
          
          {/* Event Info */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-violet-600" />
              {formatDate(ticket.eventDate)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-violet-600" />
              {formatTime(ticket.eventDate)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-violet-600" />
              {ticket.eventLocation}
            </span>
          </div>

          {/* Seat Info & Price */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            {(ticket.seatInfo || ticket.locationDisplay || ticket.zoneName) && (
              <div>
                <p className="text-xs text-slate-500">Vị trí</p>
                <p className="font-semibold text-slate-900">
                  {ticket.seatInfo || ticket.locationDisplay || 
                   [ticket.zoneName, ticket.rowName, ticket.seatNumber].filter(Boolean).join(' - ') ||
                   'Tự do'}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500">Giá vé</p>
              <p className="font-semibold text-violet-600">
                {formatCurrency(ticket.ticketPrice || ticket.price || 0)}
              </p>
            </div>
          </div>

          {/* Check-in status */}
          {isUsed && ticket.checkedInAt && (
            <div className="p-3 bg-green-50 rounded-xl flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="font-medium text-green-800 text-sm">Đã check-in</p>
                <p className="text-xs text-green-600">
                  {new Date(ticket.checkedInAt).toLocaleString('vi-VN')}
                </p>
              </div>
            </div>
          )}

          {/* Expired status */}
          {isExpired && (
            <div className="p-3 bg-orange-50 rounded-xl flex items-center gap-3">
              <Clock className="w-5 h-5 text-orange-600 shrink-0" />
              <div>
                <p className="font-medium text-orange-800 text-sm">Vé đã hết hạn</p>
                <p className="text-xs text-orange-600">
                  Sự kiện đã kết thúc, vé không còn hiệu lực
                </p>
              </div>
            </div>
          )}

          {/* Holder info */}
          {(ticket.holderName || ticket.buyerName) && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <User className="w-4 h-4" />
              <span>{ticket.holderName || ticket.buyerName}</span>
            </div>
          )}
        </div>

        {/* Download Button */}
        {onDownload && (
          <div className="px-6 pb-6">
            <Button 
              onClick={() => onDownload(ticket.ticketCode)}
              variant="outline"
              className="w-full h-12 rounded-xl font-semibold"
              disabled={isUsed || isExpired || isCancelled}
            >
              <Download className="w-5 h-5 mr-2" />
              Tải QR Code
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- CAROUSEL COMPONENT ---

interface TicketCarouselProps {
  tickets: TicketResponse[];
  onDownload?: (ticketCode: string) => void;
  className?: string;
}

export const TicketCarousel = ({ tickets, onDownload, className = "" }: TicketCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const totalTickets = tickets.length;

  // Navigate to specific ticket
  const goToTicket = (index: number) => {
    if (index >= 0 && index < totalTickets) {
      setCurrentIndex(index);
      scrollToIndex(index);
    }
  };

  const goToPrev = () => goToTicket(currentIndex - 1);
  const goToNext = () => goToTicket(currentIndex + 1);

  // Scroll to specific index
  const scrollToIndex = (index: number) => {
    if (containerRef.current) {
      const cardWidth = containerRef.current.offsetWidth;
      containerRef.current.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth'
      });
    }
  };

  // Handle scroll end to update current index
  const handleScroll = () => {
    if (containerRef.current && !isDragging) {
      const cardWidth = containerRef.current.offsetWidth;
      const newIndex = Math.round(containerRef.current.scrollLeft / cardWidth);
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < totalTickets) {
        setCurrentIndex(newIndex);
      }
    }
  };

  // Touch/Mouse drag handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    handleScroll();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    const x = e.touches[0].pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    handleScroll();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <TicketIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Không có vé nào</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Navigation Arrows */}
      {totalTickets > 1 && (
        <>
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center transition-all
              ${currentIndex === 0 
                ? 'opacity-30 cursor-not-allowed' 
                : 'hover:bg-violet-50 hover:shadow-xl'}`}
          >
            <ChevronLeft className="w-6 h-6 text-slate-700" />
          </button>
          <button
            onClick={goToNext}
            disabled={currentIndex === totalTickets - 1}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center transition-all
              ${currentIndex === totalTickets - 1 
                ? 'opacity-30 cursor-not-allowed' 
                : 'hover:bg-violet-50 hover:shadow-xl'}`}
          >
            <ChevronRight className="w-6 h-6 text-slate-700" />
          </button>
        </>
      )}

      {/* Carousel Container */}
      <div 
        ref={containerRef}
        className="overflow-x-auto snap-x snap-mandatory scrollbar-hide mx-8"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex">
          {tickets.map((ticket, index) => (
            <div key={ticket.id} className="w-full flex-shrink-0 snap-center">
              <TicketCard 
                ticket={ticket}
                index={index}
                total={totalTickets}
                onDownload={onDownload}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Dots */}
      {totalTickets > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {tickets.map((_, index) => (
            <button
              key={index}
              onClick={() => goToTicket(index)}
              className={`transition-all duration-300 rounded-full
                ${index === currentIndex 
                  ? 'w-8 h-3 bg-violet-600' 
                  : 'w-3 h-3 bg-slate-300 hover:bg-slate-400'}`}
              aria-label={`Đi đến vé ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Quick Navigation Pills */}
      {totalTickets > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {tickets.map((ticket, index) => (
            <button
              key={ticket.id}
              onClick={() => goToTicket(index)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all
                ${index === currentIndex 
                  ? 'bg-violet-600 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Vé {index + 1}
              {ticket.status === 'USED' && ' ✓'}
            </button>
          ))}
        </div>
      )}

      {/* Swipe hint for mobile */}
      {totalTickets > 1 && (
        <p className="text-center text-xs text-slate-400 mt-4 md:hidden">
          ← Vuốt ngang để xem các vé khác →
        </p>
      )}
    </div>
  );
};

export default TicketCarousel;
