"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Key để lưu previous path (dùng cho Route Guard)
 */
const PREVIOUS_PATH_KEY = 'bookingPreviousPath';

/**
 * Kiểm tra xem path có nằm trong luồng booking không
 */
function isBookingPath(path: string): boolean {
  return path.startsWith('/booking');
}

/**
 * Global Booking Guard Provider
 * 
 * Component này được đặt ở root level (Layout) để luôn theo dõi pathname changes.
 * 
 * LƯU Ý: Từ phiên bản mới, component này KHÔNG tự động hủy đơn hàng nữa.
 * Việc hủy đơn được xử lý bởi BookingNavigationContext với popup xác nhận.
 * 
 * Component này chỉ còn:
 * - Theo dõi và lưu previous path để hỗ trợ debugging
 * - Ghi log khi path thay đổi
 * 
 * QUAN TRỌNG: 
 * - useAutoCancelOrder hook xử lý: beforeunload, pagehide (đóng tab, refresh)
 * - BookingNavigationContext xử lý: client-side navigation với popup xác nhận
 * 
 * @example
 * ```tsx
 * // Trong app/layout.tsx
 * <BookingGuardProvider>
 *   {children}
 * </BookingGuardProvider>
 * ```
 */
export function BookingGuardProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const previousPathRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Khởi tạo previous path từ sessionStorage (nếu có)
    if (!isInitializedRef.current) {
      const storedPath = sessionStorage.getItem(PREVIOUS_PATH_KEY);
      if (storedPath) {
        previousPathRef.current = storedPath;
      }
      isInitializedRef.current = true;
    }
  }, []);

  useEffect(() => {
    const previousPath = previousPathRef.current;
    
    // Skip lần đầu mount (chưa có previous path)
    if (previousPath === null) {
      previousPathRef.current = pathname;
      sessionStorage.setItem(PREVIOUS_PATH_KEY, pathname);
      return;
    }

    // Skip nếu path không đổi
    if (previousPath === pathname) {
      return;
    }

    // Kiểm tra điều kiện Route Guard
    const wasInBookingFlow = isBookingPath(previousPath);
    const isStillInBookingFlow = isBookingPath(pathname);

    // Log để debug
    console.log('[BookingGuardProvider] Path changed:', {
      previousPath,
      currentPath: pathname,
      wasInBookingFlow,
      isStillInBookingFlow,
    });

    // Cập nhật previous path
    previousPathRef.current = pathname;
    sessionStorage.setItem(PREVIOUS_PATH_KEY, pathname);
    
  }, [pathname]);

  return <>{children}</>;
}
