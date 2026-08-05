"use client";

import React, { createContext, useContext, useCallback, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { manualCancelOrder, CURRENT_ORDER_ID_KEY } from '@/hooks/use-auto-cancel-order';

/**
 * Key để lưu cờ trạng thái Payment Gateway Handoff
 */
const PAYMENT_REDIRECT_FLAG_KEY = 'isRedirectingToPayment';

/**
 * Message cảnh báo khi rời booking flow
 */
const CONFIRM_MESSAGE = 'Bạn đang trong quá trình đặt vé. Nếu rời đi, vé đang giữ sẽ bị hủy và bạn phải đặt lại từ đầu.\n\nBạn có chắc chắn muốn rời đi?';

/**
 * Kiểm tra xem path có nằm trong luồng booking không
 */
function isBookingPath(path: string): boolean {
  return path.startsWith('/booking');
}

/**
 * Interface cho Navigation Context
 */
interface BookingNavigationContextType {
  /**
   * Navigate an toàn - sẽ hiển thị popup xác nhận nếu đang trong booking flow
   * @param url - URL đích
   * @param options - Tùy chọn: skipWarning để bỏ qua popup (dành cho navigation trong booking flow)
   */
  safeNavigate: (url: string, options?: { skipWarning?: boolean }) => void;
  
  /**
   * Kiểm tra xem có đang ở trang booking không
   */
  isInBookingFlow: boolean;
  
  /**
   * Kiểm tra xem có pending order cần được bảo vệ không
   */
  hasActiveOrder: () => boolean;
}

const BookingNavigationContext = createContext<BookingNavigationContextType | null>(null);

/**
 * Hook để sử dụng Booking Navigation Context
 * 
 * @example
 * ```tsx
 * const { safeNavigate } = useBookingNavigation();
 * 
 * // Thay vì:
 * router.push('/profile');
 * 
 * // Sử dụng:
 * safeNavigate('/profile');
 * ```
 */
export function useBookingNavigation() {
  const context = useContext(BookingNavigationContext);
  if (!context) {
    throw new Error('useBookingNavigation must be used within BookingNavigationProvider');
  }
  return context;
}

/**
 * Provider component cho Booking Navigation
 * 
 * Chức năng:
 * 1. Cung cấp `safeNavigate` function để navigate an toàn
 * 2. Intercept click vào Link/anchor tags trong booking flow
 * 3. Hiển thị popup confirm của browser trước khi hủy đơn và navigate ra ngoài
 * 4. Tự động phát hiện programmatic navigation và hiển thị warning
 */
export function BookingNavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Ref để track previous path (cho programmatic navigation detection)
  const previousPathRef = useRef<string | null>(null);
  const navigationTriggeredByUsRef = useRef(false);

  // Kiểm tra xem có đang ở trang booking không
  const isInBookingFlow = isBookingPath(pathname);

  /**
   * Kiểm tra xem có active order cần bảo vệ không
   */
  const hasActiveOrder = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    const orderId = sessionStorage.getItem(CURRENT_ORDER_ID_KEY);
    const isPaymentRedirect = sessionStorage.getItem(PAYMENT_REDIRECT_FLAG_KEY) === 'true';
    return !!orderId && !isPaymentRedirect;
  }, []);

  /**
   * Thực hiện navigate và hủy đơn
   */
  const executeNavigationWithCancel = useCallback(async (url: string) => {
    try {
      await manualCancelOrder();
      navigationTriggeredByUsRef.current = true;
      // Force full reload để đảm bảo state sạch
      window.location.href = url;
    } catch (error) {
      console.error('[BookingNavigation] Error cancelling order:', error);
    }
  }, []);

  /**
   * Safe navigate function - sử dụng window.confirm
   */
  const safeNavigate = useCallback((url: string, options?: { skipWarning?: boolean }) => {
    const shouldSkipWarning = options?.skipWarning ?? false;
    
    // Nếu không ở booking flow hoặc skip warning -> navigate bình thường
    if (!isInBookingFlow || shouldSkipWarning) {
      navigationTriggeredByUsRef.current = true;
      router.push(url);
      return;
    }

    // Nếu navigate đến trang trong booking flow -> cho phép
    if (isBookingPath(url)) {
      navigationTriggeredByUsRef.current = true;
      router.push(url);
      return;
    }

    // Nếu không có active order -> navigate bình thường
    if (!hasActiveOrder()) {
      navigationTriggeredByUsRef.current = true;
      router.push(url);
      return;
    }

    // Có active order và đang rời booking flow -> hiển thị confirm
    console.log('[BookingNavigation] Intercepting navigation to:', url);
    
    if (window.confirm(CONFIRM_MESSAGE)) {
      // User đồng ý rời đi -> hủy đơn và navigate
      executeNavigationWithCancel(url);
    }
    // User chọn ở lại -> không làm gì
  }, [isInBookingFlow, hasActiveOrder, router, executeNavigationWithCancel]);

  /**
   * Intercept click vào anchor tags
   */
  useEffect(() => {
    if (!isInBookingFlow) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (!anchor) return;
      
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      // Nếu là link trong booking flow -> cho phép
      if (isBookingPath(href)) return;

      // Nếu có active order -> intercept và hiển thị confirm
      if (hasActiveOrder()) {
        e.preventDefault();
        e.stopPropagation();
        console.log('[BookingNavigation] Intercepted anchor click to:', href);
        
        if (window.confirm(CONFIRM_MESSAGE)) {
          // User đồng ý rời đi -> hủy đơn và navigate
          executeNavigationWithCancel(href);
        }
      }
    };

    // Capture phase để intercept trước khi Next.js router xử lý
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [isInBookingFlow, hasActiveOrder, executeNavigationWithCancel]);

  /**
   * Phát hiện programmatic navigation từ bên ngoài
   * (khi user navigate bằng cách khác mà không qua safeNavigate)
   */
  useEffect(() => {
    const previousPath = previousPathRef.current;
    
    // First mount
    if (previousPath === null) {
      previousPathRef.current = pathname;
      return;
    }

    // Path không đổi
    if (previousPath === pathname) {
      return;
    }

    // Nếu navigation được trigger bởi chúng ta -> reset flag và skip
    if (navigationTriggeredByUsRef.current) {
      navigationTriggeredByUsRef.current = false;
      previousPathRef.current = pathname;
      return;
    }

    // Phát hiện navigation ra khỏi booking flow
    const wasInBooking = isBookingPath(previousPath);
    const stillInBooking = isBookingPath(pathname);
    
    if (wasInBooking && !stillInBooking) {
      // Kiểm tra xem có active order không
      const orderId = sessionStorage.getItem(CURRENT_ORDER_ID_KEY);
      const isPaymentRedirect = sessionStorage.getItem(PAYMENT_REDIRECT_FLAG_KEY) === 'true';
      
      if (orderId && !isPaymentRedirect) {
        console.log('[BookingNavigation] Detected external navigation out of booking flow');
        // Navigation đã xảy ra rồi, hủy đơn
        manualCancelOrder().then(() => {
          console.log('[BookingNavigation] Order cancelled due to external navigation');
        });
      }
    }

    previousPathRef.current = pathname;
  }, [pathname]);

  const contextValue: BookingNavigationContextType = {
    safeNavigate,
    isInBookingFlow,
    hasActiveOrder,
  };

  return (
    <BookingNavigationContext.Provider value={contextValue}>
      {children}
    </BookingNavigationContext.Provider>
  );
}
