"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Thời gian giữ vé mặc định: 15 phút (tính bằng giây)
 */
const BOOKING_TIMEOUT_SECONDS = 15 * 60;

/**
 * Key để lưu session trong sessionStorage
 */
const BOOKING_SESSION_KEY = "bookingSessionStartTime";
const BOOKING_DATA_KEY = "bookingData";

/**
 * Interface cho booking session
 */
export interface BookingSessionState {
  /** Thời gian còn lại (giây) */
  timeLeft: number;
  /** Session đã hết hạn chưa */
  isExpired: boolean;
  /** Đang có session active không */
  isActive: boolean;
  /** Thời điểm bắt đầu session (ISO string) */
  startTime: string | null;
  /** Thời điểm hết hạn (ISO string) */
  expireTime: string | null;
}

/**
 * Interface cho kết quả hook
 */
export interface UseBookingSessionResult extends BookingSessionState {
  /** Bắt đầu session mới */
  startSession: () => void;
  /** Kết thúc session (khi thanh toán xong) */
  endSession: () => void;
  /** Reset session (khi hết giờ hoặc hủy) */
  clearSession: () => void;
  /** Format thời gian còn lại thành MM:SS */
  formattedTime: string;
  /** Thời gian còn lại dưới 1 phút (urgent) */
  isUrgent: boolean;
  /** Thời gian còn lại dưới 3 phút (warning) */
  isWarning: boolean;
}

/**
 * Options cho hook
 */
export interface UseBookingSessionOptions {
  /** Event ID để redirect khi hết giờ */
  eventId?: string;
  /** Callback khi session hết hạn */
  onExpired?: () => void;
  /** Tự động redirect về trang sự kiện khi hết giờ */
  autoRedirect?: boolean;
  /** Timeout tùy chỉnh (giây) */
  timeoutSeconds?: number;
}

/**
 * Hook quản lý booking session với countdown timer
 * 
 * Sử dụng:
 * - Bắt đầu session khi user vào trang chọn vé
 * - Countdown hiển thị trên tất cả các trang booking
 * - Khi hết giờ, tự động redirect về trang sự kiện
 * 
 * @example
 * ```tsx
 * const { timeLeft, formattedTime, isExpired, startSession } = useBookingSession({
 *   eventId: 'xxx',
 *   onExpired: () => toast.error('Hết thời gian giữ vé!')
 * });
 * 
 * // Trong trang tickets, gọi startSession() khi mount
 * useEffect(() => {
 *   if (!isActive) startSession();
 * }, []);
 * ```
 */
export function useBookingSession(
  options: UseBookingSessionOptions = {}
): UseBookingSessionResult {
  const {
    eventId,
    onExpired,
    autoRedirect = true,
    timeoutSeconds = BOOKING_TIMEOUT_SECONDS,
  } = options;

  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasExpiredRef = useRef(false);
  
  // Use ref for onExpired to avoid dependency cycles
  const onExpiredRef = useRef(onExpired);
  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);

  // State
  const [state, setState] = useState<BookingSessionState>({
    timeLeft: timeoutSeconds,
    isExpired: false,
    isActive: false,
    startTime: null,
    expireTime: null,
  });

  /**
   * Tính thời gian còn lại từ session đã lưu
   */
  const calculateTimeLeft = useCallback((): number => {
    if (typeof window === 'undefined') return 0;

    const startTimeStr = sessionStorage.getItem(BOOKING_SESSION_KEY);
    if (!startTimeStr) return 0;

    const startTime = new Date(startTimeStr).getTime();
    const expireTime = startTime + timeoutSeconds * 1000;
    const now = Date.now();
    const remaining = Math.floor((expireTime - now) / 1000);

    return remaining > 0 ? remaining : 0;
  }, [timeoutSeconds]);

  /**
   * Bắt đầu session mới
   */
  const startSession = useCallback(() => {
    // Kiểm tra xem đã có session chưa
    const existingStartTime = sessionStorage.getItem(BOOKING_SESSION_KEY);
    
    if (existingStartTime) {
      // Đã có session, kiểm tra còn hạn không
      const remaining = calculateTimeLeft();
      if (remaining > 0) {
        // Session còn hạn, cập nhật state nhưng không tạo mới start time
        const expireTime = new Date(
           new Date(existingStartTime).getTime() + timeoutSeconds * 1000
        ).toISOString();
        
        setState(prev => ({
            ...prev,
            timeLeft: remaining,
            isActive: true,
            startTime: existingStartTime,
            expireTime,
            isExpired: false
        }));
        return;
      }
    }

    // Tạo session mới
    const now = new Date().toISOString();
    const expireTime = new Date(Date.now() + timeoutSeconds * 1000).toISOString();
    
    sessionStorage.setItem(BOOKING_SESSION_KEY, now);
    hasExpiredRef.current = false;

    setState({
      timeLeft: timeoutSeconds,
      isExpired: false,
      isActive: true,
      startTime: now,
      expireTime,
    });

    console.log("🎫 Booking session started:", { startTime: now, expireTime });
  }, [timeoutSeconds, calculateTimeLeft]);

  /**
   * Kết thúc session (thanh toán thành công)
   */
  const endSession = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    sessionStorage.removeItem(BOOKING_SESSION_KEY);
    hasExpiredRef.current = false;

    setState({
      timeLeft: 0,
      isExpired: false,
      isActive: false,
      startTime: null,
      expireTime: null,
    });

    console.log("✅ Booking session ended successfully");
  }, []);

  /**
   * Xóa session (hết giờ hoặc hủy)
   */
  const clearSession = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    sessionStorage.removeItem(BOOKING_SESSION_KEY);
    sessionStorage.removeItem(BOOKING_DATA_KEY);
    hasExpiredRef.current = false;

    setState({
      timeLeft: 0,
      isExpired: true,
      isActive: false,
      startTime: null,
      expireTime: null,
    });

    console.log("🗑️ Booking session cleared");
  }, []);

  /**
   * Xử lý khi session hết hạn
   */
  const handleExpire = useCallback(() => {
    if (hasExpiredRef.current) return;
    hasExpiredRef.current = true;

    console.log("⏰ Booking session expired!");

    // Clear session
    clearSession();

    // Gọi callback
    onExpiredRef.current?.();

    // Redirect nếu cần
    if (autoRedirect && eventId) {
      alert("Hết thời gian giữ vé! Vui lòng đặt lại.");
      router.push(`/events/${eventId}`);
    }
  }, [clearSession, autoRedirect, eventId, router]);

  /**
   * Khởi tạo và theo dõi session
   */
  useEffect(() => {
    // Check initial session
    const startTimeStr = sessionStorage.getItem(BOOKING_SESSION_KEY);

    if (startTimeStr) {
      const remaining = calculateTimeLeft();

      if (remaining <= 0) {
        // Session đã hết hạn
        // We will let the interval effect handle the expiration if needed,
        // or just set expired state here if we want immediate feedback
      } else {
        const expireTime = new Date(
          new Date(startTimeStr).getTime() + timeoutSeconds * 1000
        ).toISOString();
        
        setState(prev => ({
            ...prev,
            timeLeft: remaining,
            isActive: true,
            startTime: startTimeStr,
            expireTime
        }));
      }
    }
  }, [timeoutSeconds, calculateTimeLeft]);

  // The interval effect - dependent on expireTime
  useEffect(() => {
    if (!state.expireTime) return;
    
    // Clear any existing timer
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const target = new Date(state.expireTime!).getTime();
      const now = Date.now();
      const distance = Math.floor((target - now) / 1000);
      
      if (distance <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleExpire();
      } else {
          setState(prev => ({
              ...prev,
              timeLeft: distance
          }));
      }
    }, 1000);

    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.expireTime, handleExpire]);

  // Computed values
  const mins = Math.floor(state.timeLeft / 60);
  const secs = state.timeLeft % 60;
  const formattedTime = `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
  const isUrgent = state.timeLeft < 60 && state.timeLeft > 0;
  const isWarning = state.timeLeft < 180 && state.timeLeft >= 60;

  return {
    ...state,
    startSession,
    endSession,
    clearSession,
    formattedTime,
    isUrgent,
    isWarning,
  };
}

export default useBookingSession;
