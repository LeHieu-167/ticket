"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Search, MapPin, Ticket, Calendar, Loader2, Inbox,
  Grid3X3, List, ChevronDown, X, ArrowUpDown, Tag, Clock, Filter,
  Sparkles, TrendingUp, Flame
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/layouts/Header";
import eventService, { EventResponse } from "@/apis/event.service";

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
  const weekday = date.toLocaleDateString('vi-VN', { weekday: 'short' });
  return { day, month, year, time, weekday, full: `${day}/${month}/${year}` };
};

// --- CONSTANTS ---

const LOCATIONS = [
  { value: '', label: 'Tất cả địa điểm' },
  { value: 'Hà Nội', label: 'Hà Nội' },
  { value: 'TP. Hồ Chí Minh', label: 'TP. Hồ Chí Minh' },
  { value: 'Đà Nẵng', label: 'Đà Nẵng' },
  { value: 'Hải Phòng', label: 'Hải Phòng' },
  { value: 'Cần Thơ', label: 'Cần Thơ' },
];

const CATEGORIES = [
  { value: '', label: 'Tất cả thể loại' },
  { value: 'Âm nhạc', label: '🎵 Âm nhạc' },
  { value: 'Thể thao', label: '⚽ Thể thao' },
  { value: 'Nghệ thuật', label: '🎨 Nghệ thuật' },
  { value: 'Hội thảo', label: '🎤 Hội thảo' },
  { value: 'Workshop', label: '💡 Workshop' },
  { value: 'Festival', label: '🎉 Festival' },
];

const PRICE_RANGES = [
  { value: '', label: 'Tất cả mức giá', min: undefined, max: undefined },
  { value: 'free', label: 'Miễn phí', min: 0, max: 0 },
  { value: 'under500k', label: 'Dưới 500K', min: 0, max: 500000 },
  { value: '500k-1m', label: '500K - 1M', min: 500000, max: 1000000 },
  { value: '1m-2m', label: '1M - 2M', min: 1000000, max: 2000000 },
  { value: 'over2m', label: 'Trên 2M', min: 2000000, max: undefined },
];

const TIME_FILTERS = [
  { value: '', label: 'Tất cả thời gian' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'tomorrow', label: 'Ngày mai' },
  { value: 'this-week', label: 'Tuần này' },
  { value: 'this-month', label: 'Tháng này' },
];

const SORT_OPTIONS = [
  { value: 'eventDate-asc', label: 'Sắp diễn ra' },
  { value: 'eventDate-desc', label: 'Xa nhất' },
  { value: 'ticketPrice-asc', label: 'Giá thấp nhất' },
  { value: 'ticketPrice-desc', label: 'Giá cao nhất' },
  { value: 'createdAt-desc', label: 'Mới nhất' },
];

// --- COMPONENTS ---

// Hero Section with integrated search
interface HeroSectionProps {
  searchKeyword: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
}

const HeroSection = ({ searchKeyword, onSearchChange, onSearch }: HeroSectionProps) => (
  <section className="relative w-full bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 overflow-hidden">
    {/* Animated Background Pattern */}
    <div className="absolute inset-0 opacity-30">
      <div className="absolute top-0 left-0 w-96 h-96 bg-violet-500 rounded-full filter blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500 rounded-full filter blur-3xl opacity-50" />
    </div>
    
    {/* Background Image Overlay */}
    <div 
      className="absolute inset-0 bg-cover bg-center opacity-20" 
      style={{ backgroundImage: `url('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop')`}} 
    />
    
    <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
      <div className="max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 py-2 px-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <span>Nền tảng đặt vé sự kiện</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight text-white">
          Khám phá & Đặt vé
          <span className="block bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Sự kiện đỉnh cao
          </span>
        </h1>
        
        <p className="text-violet-200 text-lg md:text-xl mb-10 max-w-2xl mx-auto font-light">
          Hàng ngàn sự kiện âm nhạc, thể thao, nghệ thuật đang chờ bạn. 
          Thanh toán an toàn, nhận vé tức thì.
        </p>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 p-2 flex flex-col sm:flex-row gap-2 items-center max-w-2xl mx-auto">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
              placeholder="Tìm sự kiện, nghệ sĩ, địa điểm..." 
              value={searchKeyword}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className="pl-12 h-14 border-0 bg-transparent text-lg focus-visible:ring-0 placeholder:text-slate-400 text-slate-900" 
            />
          </div>
          <Button 
            size="lg" 
            onClick={onSearch}
            className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 h-14 px-8 rounded-xl text-base font-semibold shadow-lg shadow-violet-300"
          >
            <Search className="w-5 h-5 mr-2" />
            Tìm kiếm
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="flex flex-wrap justify-center gap-8 mt-12 text-white/80">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">1000+</div>
            <div className="text-sm">Sự kiện</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">500K+</div>
            <div className="text-sm">Người dùng</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">50+</div>
            <div className="text-sm">Thành phố</div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// Filter Dropdown Component
interface FilterDropdownProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
}

const FilterDropdown = ({ label, value, options, onChange, icon }: FilterDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm font-medium whitespace-nowrap
          ${value ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-white border-slate-200 text-slate-700 hover:border-violet-300 hover:bg-violet-50'}`}
      >
        {icon}
        <span className="max-w-[100px] truncate">{selectedOption?.label || label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-20 max-h-64 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                  ${option.value === value ? 'bg-violet-50 text-violet-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Active Filter Tag
const ActiveFilterTag = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-sm font-medium">
    {label}
    <button onClick={onRemove} className="hover:bg-violet-200 rounded-full p-0.5 transition-colors">
      <X className="w-3.5 h-3.5" />
    </button>
  </span>
);

// Event Card - Grid View
const EventCardGrid = ({ event }: { event: EventResponse }) => {
  const { day, month, time, weekday } = formatDate(event.eventDate);
  const displayImage = event.thumbnailUrl || event.bannerImageUrl || 
    "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1000&auto=format&fit=crop";

  return (
    <Link href={`/events/${event.slug}`}>
      <Card className="group overflow-hidden border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 rounded-2xl cursor-pointer h-full flex flex-col bg-white">
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
          <img 
            src={displayImage} 
            alt={event.name} 
            className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {/* Category Badge */}
          <div className="absolute top-3 left-3">
            <span className="bg-violet-600/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
              {event.category || "Sự kiện"}
            </span>
          </div>
          
          {/* Hot Badge */}
          {event.availableTickets <= 50 && event.availableTickets > 0 && (
            <div className="absolute top-3 right-3">
              <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
                <Flame className="w-3 h-3" />
                Hot
              </span>
            </div>
          )}
        </div>

        <CardContent className="p-5 flex flex-col flex-1">
          <div className="flex items-start gap-4 mb-3">
            <div className="flex flex-col items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-xl px-3 py-2 min-w-[60px] shadow-lg">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Thg {month}</span>
              <span className="text-2xl font-black">{day}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 line-clamp-2 text-lg leading-snug group-hover:text-violet-600 transition-colors">
                {event.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {weekday}, {time}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-600 text-sm mt-auto mb-4 bg-slate-50 p-2.5 rounded-lg">
            <MapPin className="h-4 w-4 shrink-0 text-violet-500" />
            <span className="truncate font-medium">{event.location}</span>
          </div>
          
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Giá từ</p>
              <span className="font-bold text-violet-600 text-xl">{formatCurrency(event.ticketPrice)}</span>
            </div>
            <Button size="sm" className="rounded-full px-5 bg-slate-900 hover:bg-violet-600 text-white transition-colors shadow-md">
              Mua vé
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

// Event Card - List View
const EventCardList = ({ event }: { event: EventResponse }) => {
  const { day, month, time, weekday, full } = formatDate(event.eventDate);
  const displayImage = event.thumbnailUrl || event.bannerImageUrl || 
    "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1000&auto=format&fit=crop";

  return (
    <Link href={`/events/${event.slug}`}>
      <Card className="group overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl cursor-pointer bg-white">
        <div className="flex flex-col md:flex-row">
          <div className="relative w-full md:w-64 aspect-[16/10] md:aspect-auto overflow-hidden bg-slate-100 shrink-0">
            <img 
              src={displayImage} 
              alt={event.name} 
              className="object-cover w-full h-full md:h-44 group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute top-3 left-3">
              <span className="bg-violet-600/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full">
                {event.category || "Sự kiện"}
              </span>
            </div>
          </div>

          <CardContent className="p-5 flex flex-col flex-1 justify-between">
            <div>
              <div className="flex items-start gap-4 mb-2">
                <div className="hidden sm:flex flex-col items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-xl px-3 py-2 min-w-[55px] shadow-lg">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Thg {month}</span>
                  <span className="text-xl font-black">{day}</span>
                </div>
                
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 text-lg leading-snug group-hover:text-violet-600 transition-colors line-clamp-1">
                    {event.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-violet-500" />
                      {full}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-violet-500" />
                      {time}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-600 text-sm mt-2">
                <MapPin className="h-4 w-4 shrink-0 text-violet-500" />
                <span className="font-medium truncate">{event.location}</span>
              </div>
            </div>
            
            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Giá từ</p>
                <span className="font-bold text-violet-600 text-lg">{formatCurrency(event.ticketPrice)}</span>
              </div>
              <Button className="rounded-full px-5 bg-violet-600 hover:bg-violet-700 text-white shadow-md">
                Đặt vé
              </Button>
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
};

// Empty State
const EmptyState = ({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) => (
  <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-gradient-to-b from-slate-50 to-white rounded-3xl border border-slate-100">
    <div className="bg-white p-8 rounded-full mb-6 shadow-lg">
      <Inbox className="h-12 w-12 text-violet-300" />
    </div>
    <h3 className="text-xl font-bold text-slate-700 mb-2">
      {hasFilters ? "Không tìm thấy sự kiện" : "Chưa có sự kiện nào"}
    </h3>
    <p className="max-w-md text-center text-slate-500 mb-6">
      {hasFilters 
        ? "Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm để có kết quả tốt hơn."
        : "Hệ thống đang cập nhật các sự kiện mới nhất. Vui lòng quay lại sau."}
    </p>
    {hasFilters && (
      <Button onClick={onClearFilters} variant="outline" className="rounded-full border-violet-200 text-violet-600 hover:bg-violet-50">
        <X className="w-4 h-4 mr-2" />
        Xóa bộ lọc
      </Button>
    )}
  </div>
);

// --- TRANG CHỦ CHÍNH ---
export default function HomePage() {
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Filter States
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPriceRange, setSelectedPriceRange] = useState('');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('');
  const [sortOption, setSortOption] = useState('eventDate-asc');

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        const data = await eventService.getAllEvents();
        setEvents(data);
      } catch (error) {
        console.error("Lỗi khi tải danh sách sự kiện:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    let result = [...events];

    // Keyword search
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(event => 
        event.name.toLowerCase().includes(keyword) ||
        event.description?.toLowerCase().includes(keyword) ||
        event.location.toLowerCase().includes(keyword) ||
        event.organizerName?.toLowerCase().includes(keyword)
      );
    }

    // Location filter
    if (selectedLocation) {
      result = result.filter(event => 
        event.location.toLowerCase().includes(selectedLocation.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory) {
      result = result.filter(event => 
        event.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Price filter
    if (selectedPriceRange) {
      const priceRange = PRICE_RANGES.find(p => p.value === selectedPriceRange);
      if (priceRange) {
        result = result.filter(event => {
          if (priceRange.min !== undefined && event.ticketPrice < priceRange.min) return false;
          if (priceRange.max !== undefined && event.ticketPrice > priceRange.max) return false;
          return true;
        });
      }
    }

    // Time filter
    if (selectedTimeFilter) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      result = result.filter(event => {
        const eventDate = new Date(event.eventDate);
        
        switch (selectedTimeFilter) {
          case 'today':
            return eventDate.toDateString() === today.toDateString();
          case 'tomorrow':
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return eventDate.toDateString() === tomorrow.toDateString();
          case 'this-week':
            const endOfWeek = new Date(today);
            endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
            return eventDate >= today && eventDate <= endOfWeek;
          case 'this-month':
            return eventDate.getMonth() === today.getMonth() && eventDate.getFullYear() === today.getFullYear();
          default:
            return true;
        }
      });
    }

    // Sorting
    const [sortBy, sortDir] = sortOption.split('-') as [string, 'asc' | 'desc'];
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'eventDate':
          comparison = new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
          break;
        case 'ticketPrice':
          comparison = a.ticketPrice - b.ticketPrice;
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      
      return sortDir === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [events, searchKeyword, selectedLocation, selectedCategory, selectedPriceRange, selectedTimeFilter, sortOption]);

  const hasActiveFilters = searchKeyword || selectedLocation || selectedCategory || selectedPriceRange || selectedTimeFilter;

  const clearAllFilters = () => {
    setSearchKeyword('');
    setSelectedLocation('');
    setSelectedCategory('');
    setSelectedPriceRange('');
    setSelectedTimeFilter('');
  };

  const getActiveFilterLabels = () => {
    const labels: { key: string; label: string }[] = [];
    
    if (selectedLocation) {
      const loc = LOCATIONS.find(l => l.value === selectedLocation);
      if (loc) labels.push({ key: 'location', label: loc.label });
    }
    if (selectedCategory) {
      const cat = CATEGORIES.find(c => c.value === selectedCategory);
      if (cat) labels.push({ key: 'category', label: cat.label });
    }
    if (selectedPriceRange) {
      const price = PRICE_RANGES.find(p => p.value === selectedPriceRange);
      if (price) labels.push({ key: 'price', label: price.label });
    }
    if (selectedTimeFilter) {
      const time = TIME_FILTERS.find(t => t.value === selectedTimeFilter);
      if (time) labels.push({ key: 'time', label: time.label });
    }
    
    return labels;
  };

  const removeFilter = (key: string) => {
    switch (key) {
      case 'location': setSelectedLocation(''); break;
      case 'category': setSelectedCategory(''); break;
      case 'price': setSelectedPriceRange(''); break;
      case 'time': setSelectedTimeFilter(''); break;
    }
  };

  const scrollToEvents = () => {
    document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection 
          searchKeyword={searchKeyword}
          onSearchChange={setSearchKeyword}
          onSearch={scrollToEvents}
        />

        {/* Events Section */}
        <section id="events" className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-violet-600" />
                  <span className="text-violet-600 font-semibold text-sm uppercase tracking-wider">Khám phá</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                  Tất cả sự kiện
                </h2>
                <p className="text-slate-500 mt-2">
                  Tìm thấy <span className="font-bold text-violet-600">{filteredEvents.length}</span> sự kiện phù hợp
                </p>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-8">
              {/* Desktop Filters */}
              <div className="hidden md:flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <FilterDropdown
                    label="Địa điểm"
                    value={selectedLocation}
                    options={LOCATIONS}
                    onChange={setSelectedLocation}
                    icon={<MapPin className="w-4 h-4" />}
                  />
                  <FilterDropdown
                    label="Thể loại"
                    value={selectedCategory}
                    options={CATEGORIES}
                    onChange={setSelectedCategory}
                    icon={<Tag className="w-4 h-4" />}
                  />
                  <FilterDropdown
                    label="Thời gian"
                    value={selectedTimeFilter}
                    options={TIME_FILTERS}
                    onChange={setSelectedTimeFilter}
                    icon={<Calendar className="w-4 h-4" />}
                  />
                  <FilterDropdown
                    label="Mức giá"
                    value={selectedPriceRange}
                    options={PRICE_RANGES}
                    onChange={setSelectedPriceRange}
                    icon={<Ticket className="w-4 h-4" />}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <FilterDropdown
                    label="Sắp xếp"
                    value={sortOption}
                    options={SORT_OPTIONS}
                    onChange={setSortOption}
                    icon={<ArrowUpDown className="w-4 h-4" />}
                  />

                  <div className="flex items-center bg-slate-100 rounded-xl p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-violet-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-violet-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile Filter Button */}
              <div className="md:hidden flex items-center justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="flex items-center gap-2 rounded-xl"
                >
                  <Filter className="w-4 h-4" />
                  Bộ lọc
                  {hasActiveFilters && (
                    <span className="bg-violet-600 text-white text-xs px-2 py-0.5 rounded-full">
                      {getActiveFilterLabels().length}
                    </span>
                  )}
                </Button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2.5 rounded-lg ${viewMode === 'grid' ? 'bg-violet-100 text-violet-600' : 'text-slate-500'}`}
                  >
                    <Grid3X3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2.5 rounded-lg ${viewMode === 'list' ? 'bg-violet-100 text-violet-600' : 'text-slate-500'}`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Mobile Filters Panel */}
              {showMobileFilters && (
                <div className="md:hidden mt-4 pt-4 border-t grid grid-cols-2 gap-2">
                  <FilterDropdown
                    label="Địa điểm"
                    value={selectedLocation}
                    options={LOCATIONS}
                    onChange={setSelectedLocation}
                    icon={<MapPin className="w-4 h-4" />}
                  />
                  <FilterDropdown
                    label="Thể loại"
                    value={selectedCategory}
                    options={CATEGORIES}
                    onChange={setSelectedCategory}
                    icon={<Tag className="w-4 h-4" />}
                  />
                  <FilterDropdown
                    label="Thời gian"
                    value={selectedTimeFilter}
                    options={TIME_FILTERS}
                    onChange={setSelectedTimeFilter}
                    icon={<Calendar className="w-4 h-4" />}
                  />
                  <FilterDropdown
                    label="Mức giá"
                    value={selectedPriceRange}
                    options={PRICE_RANGES}
                    onChange={setSelectedPriceRange}
                    icon={<Ticket className="w-4 h-4" />}
                  />
                  <div className="col-span-2">
                    <FilterDropdown
                      label="Sắp xếp"
                      value={sortOption}
                      options={SORT_OPTIONS}
                      onChange={setSortOption}
                      icon={<ArrowUpDown className="w-4 h-4" />}
                    />
                  </div>
                </div>
              )}

              {/* Active Filters Tags */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t flex-wrap">
                  <span className="text-sm text-slate-500">Đang lọc:</span>
                  {searchKeyword && (
                    <ActiveFilterTag 
                      label={`"${searchKeyword}"`} 
                      onRemove={() => setSearchKeyword('')} 
                    />
                  )}
                  {getActiveFilterLabels().map(({ key, label }) => (
                    <ActiveFilterTag 
                      key={key} 
                      label={label} 
                      onRemove={() => removeFilter(key)} 
                    />
                  ))}
                  <button 
                    onClick={clearAllFilters}
                    className="text-sm text-violet-600 hover:text-violet-700 font-medium ml-2 hover:underline"
                  >
                    Xóa tất cả
                  </button>
                </div>
              )}
            </div>

            {/* Events Grid/List */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-32">
                <Loader2 className="h-12 w-12 animate-spin text-violet-600 mb-4" />
                <p className="text-slate-500 font-medium animate-pulse">Đang tải sự kiện...</p>
              </div>
            ) : filteredEvents.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredEvents.map((event) => (
                    <EventCardGrid key={event.id} event={event} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredEvents.map((event) => (
                    <EventCardList key={event.id} event={event} />
                  ))}
                </div>
              )
            ) : (
              <EmptyState hasFilters={!!hasActiveFilters} onClearFilters={clearAllFilters} />
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="bg-gradient-to-br from-violet-500 to-purple-500 p-2 rounded-xl">
                  <Ticket className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-black">TicketHub</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Nền tảng đặt vé sự kiện hàng đầu Việt Nam. Kết nối đam mê, lan tỏa cảm xúc.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Về chúng tôi</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><a href="#" className="hover:text-violet-400 transition-colors">Giới thiệu</a></li>
                <li><a href="#" className="hover:text-violet-400 transition-colors">Liên hệ</a></li>
                <li><a href="#" className="hover:text-violet-400 transition-colors">Tuyển dụng</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Hỗ trợ</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><a href="#" className="hover:text-violet-400 transition-colors">Trung tâm trợ giúp</a></li>
                <li><a href="#" className="hover:text-violet-400 transition-colors">Chính sách bảo mật</a></li>
                <li><a href="#" className="hover:text-violet-400 transition-colors">Điều khoản sử dụng</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Theo dõi</h4>
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center hover:bg-violet-600 transition-colors cursor-pointer">
                  <span className="text-sm">FB</span>
                </div>
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center hover:bg-violet-600 transition-colors cursor-pointer">
                  <span className="text-sm">IG</span>
                </div>
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center hover:bg-violet-600 transition-colors cursor-pointer">
                  <span className="text-sm">YT</span>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-slate-500 text-sm">
            © 2025 TicketHub. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
