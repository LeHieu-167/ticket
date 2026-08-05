"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import orderService from '@/apis/order.service';

/**
 * Các trang thuộc luồng đặt vé mà hook này sẽ hoạt động
 * Khi người dùng rời khỏi các trang này, đơn hàng sẽ bị hủy tự động
 */
const BOOKING_FLOW_PAGES = ['/booking'];

/**
 * Key để lưu orderId trong sessionStorage
 */
export const CURRENT_ORDER_ID_KEY = 'currentOrderId';

/**
 * Key để lưu cờ trạng thái Payment Gateway Handoff
 * Khi cờ này = 'true', hook sẽ KHÔNG hủy đơn hàng khi rời trang
 */
const PAYMENT_REDIRECT_FLAG_KEY = 'isRedirectingToPayment';

/**
 * Key để lưu previous path (dùng cho Route Guard)
 */
const PREVIOUS_PATH_KEY = 'bookingPreviousPath';

/**
 * Key để lưu booking session (countdown timer)
 */
const BOOKING_SESSION_KEY = 'bookingSessionStartTime';

/**
 * Key để lưu booking data
 */
const BOOKING_DATA_KEY = 'bookingData';

/**
 * Kiểm tra xem path có nằm trong luồng booking không
 */
function isBookingPath(path: string): boolean {
  return BOOKING_FLOW_PAGES.some(page => path.startsWith(page));
}

/**
 * Hook tự động hủy đơn hàng khi người dùng rời khỏi luồng đặt vé
 * 
 * Tính năng:
 * - Sử dụng navigator.sendBeacon để gửi yêu cầu hủy đáng tin cậy
 * - Gửi kèm JWT token trong body để xác thực (vá lỗ hổng IDOR)
 * - Hiển thị cảnh báo cho người dùng trước khi rời trang (tránh hủy nhầm khi F5)
 * - KHÔNG hủy đơn khi đang chuyển hướng đến Payment Gateway (VNPay)
 * 
 * LƯU Ý: 
 * - Hook này chỉ xử lý: beforeunload (đóng tab, refresh, gõ URL mới), pagehide (mobile)
 * - Client-side navigation (click Logo, menu, nút Quay lại...) được xử lý bởi 
 *   BookingNavigationContext với popup xác nhận của browser
 * 
 * Cách sử dụng:
 * 1. Khi tạo order thành công, lưu orderId: setCurrentOrderId(orderId)
 * 2. Gọi hook này trong các trang booking: useAutoCancelOrder()
 * 3. Trước khi redirect đến VNPay: setPaymentRedirectFlag()
 * 4. Khi thanh toán thành công: clearCurrentOrderId()
 */
export function useAutoCancelOrder(): void {
  const pathname = usePathname();
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    /**
     * Handler cho sự kiện beforeunload
     * Kích hoạt khi người dùng đóng tab, tắt trình duyệt, hoặc navigate ra ngoài
     */
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Kiểm tra cờ Payment Gateway Handoff
      const isRedirectingToPayment = sessionStorage.getItem(PAYMENT_REDIRECT_FLAG_KEY) === 'true';
      
      // Nếu đang chuyển hướng đến Payment Gateway -> KHÔNG HỦY ĐƠN
      if (isRedirectingToPayment) {
        console.log('[AutoCancelOrder] Payment Gateway Handoff detected - skipping cancel');
        return; // Thoát ngay, không làm gì cả
      }
      
      // Kiểm tra xem đang ở trang booking không
      const isInBookingPage = isBookingPath(pathname);
      
      // Lấy orderId từ sessionStorage
      const orderId = sessionStorage.getItem(CURRENT_ORDER_ID_KEY);
      
      // Chỉ xử lý nếu đang ở trang booking VÀ có orderId
      if (isInBookingPage && orderId) {
        // Hiển thị cảnh báo mặc định của trình duyệt
        // Điều này giúp người dùng biết rằng vé sẽ bị hủy nếu họ rời đi
        event.preventDefault();
        event.returnValue = ''; // Bắt buộc cho một số trình duyệt

        // Chỉ gửi beacon một lần
        if (!hasTriggeredRef.current) {
          hasTriggeredRef.current = true;
          sendCancelBeacon(orderId);
        }
      }
    };

    /**
     * Handler cho sự kiện pagehide
     * Đây là sự kiện đáng tin cậy hơn beforeunload trên mobile
     */
    const handlePageHide = (event: PageTransitionEvent) => {
      // Kiểm tra cờ Payment Gateway Handoff
      const isRedirectingToPayment = sessionStorage.getItem(PAYMENT_REDIRECT_FLAG_KEY) === 'true';
      
      // Nếu đang chuyển hướng đến Payment Gateway -> KHÔNG HỦY ĐƠN
      if (isRedirectingToPayment) {
        console.log('[AutoCancelOrder] Payment Gateway Handoff detected (pagehide) - skipping cancel');
        return;
      }
      
      // pagehide với persisted = false nghĩa là trang thực sự bị đóng
      if (!event.persisted) {
        const isInBookingPage = isBookingPath(pathname);
        const orderId = sessionStorage.getItem(CURRENT_ORDER_ID_KEY);
        
        if (isInBookingPage && orderId && !hasTriggeredRef.current) {
          hasTriggeredRef.current = true;
          sendCancelBeacon(orderId);
        }
      }
    };

    // Đăng ký event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      hasTriggeredRef.current = false;
    };
  }, [pathname]);
}

/**
 * Gửi yêu cầu hủy đơn hàng qua sendBeacon
 * 
 * @param orderId - ID của đơn hàng cần hủy
 */
function sendCancelBeacon(orderId: string): void {
  try {
    // Lấy token từ localStorage
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      console.warn('[AutoCancelOrder] Không có token, bỏ qua beacon cancel');
      return;
    }

    // URL của endpoint beacon-cancel
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/orders/beacon-cancel`;
    
    // Tạo payload JSON
    const payload = {
      orderId: orderId,
      token: token,
    };

    // Tạo Blob với content-type JSON
    const blob = new Blob(
      [JSON.stringify(payload)], 
      { type: 'application/json' }
    );

    // Gửi beacon
    const success = navigator.sendBeacon(apiUrl, blob);
    
    if (success) {
      console.log('[AutoCancelOrder] Đã gửi beacon cancel cho orderId:', orderId);
    } else {
      console.warn('[AutoCancelOrder] sendBeacon thất bại cho orderId:', orderId);
    }

    // Xóa tất cả booking data khỏi sessionStorage sau khi gửi beacon
    sessionStorage.removeItem(CURRENT_ORDER_ID_KEY);
    sessionStorage.removeItem(BOOKING_SESSION_KEY);
    sessionStorage.removeItem(BOOKING_DATA_KEY);
    
  } catch (error) {
    console.error('[AutoCancelOrder] Lỗi khi gửi beacon:', error);
  }
}

/**
 * Hủy đơn hàng thủ công (dùng cho Navigation Confirmation)
 * Sử dụng API call thông thường thay vì Beacon để có thể await
 * 
 * Sẽ xóa tất cả booking-related session data:
 * - currentOrderId
 * - bookingSessionStartTime (countdown timer)
 * - bookingData
 */
export async function manualCancelOrder(orderId?: string | null): Promise<void> {
    const id = orderId || sessionStorage.getItem(CURRENT_ORDER_ID_KEY);
    if (!id) return;

    try {
        await orderService.cancelOrder(id);
        console.log('[AutoCancelOrder] Manual cancel success:', id);
    } catch (error) {
        console.error('[AutoCancelOrder] Manual cancel failed:', error);
    } finally {
        // Luôn xóa tất cả session data dù API thành công hay thất bại
        clearAllBookingData();
    }
}

/**
 * Xóa tất cả booking-related session data
 * Dùng khi hủy đơn hàng hoặc reset booking flow
 */
export function clearAllBookingData(): void {
    sessionStorage.removeItem(CURRENT_ORDER_ID_KEY);
    sessionStorage.removeItem(BOOKING_SESSION_KEY);
    sessionStorage.removeItem(BOOKING_DATA_KEY);
    sessionStorage.removeItem(PREVIOUS_PATH_KEY);
    console.log('[AutoCancelOrder] All booking data cleared');
}

/**
 * Utility function để lưu orderId khi tạo đơn hàng thành công
 */
export function setCurrentOrderId(orderId: string): void {
  sessionStorage.setItem(CURRENT_ORDER_ID_KEY, orderId);
}

/**
 * Utility function để xóa orderId (khi thanh toán thành công hoặc hủy thủ công)
 */
export function clearCurrentOrderId(): void {
  sessionStorage.removeItem(CURRENT_ORDER_ID_KEY);
}

/**
 * Utility function để lấy orderId hiện tại
 */
export function getCurrentOrderId(): string | null {
  return sessionStorage.getItem(CURRENT_ORDER_ID_KEY);
}

// ==================== PAYMENT GATEWAY HANDOFF ====================

/**
 * Đặt cờ trạng thái Payment Gateway Handoff
 * GỌI HÀM NÀY TRƯỚC KHI REDIRECT ĐẾN VNPAY
 * 
 * Khi cờ này được bật, hook sẽ KHÔNG hủy đơn hàng khi rời trang
 * vì biết rằng người dùng đang được chuyển hướng đến cổng thanh toán
 * 
 * @example
 * ```tsx
 * const handlePayment = async () => {
 *   const paymentUrl = await createPaymentUrl();
 *   setPaymentRedirectFlag(); // Bật cờ TRƯỚC KHI redirect
 *   window.location.href = paymentUrl; // Redirect đến VNPay
 * };
 * ```
 */
export function setPaymentRedirectFlag(): void {
  sessionStorage.setItem(PAYMENT_REDIRECT_FLAG_KEY, 'true');
  console.log('[AutoCancelOrder] Payment redirect flag SET - auto-cancel will be skipped');
}

/**
 * Xóa cờ trạng thái Payment Gateway Handoff
 * Gọi khi quay lại từ VNPay (dù thành công hay thất bại)
 * 
 * Lưu ý: Nếu thanh toán thất bại và user muốn thử lại,
 * hook vẫn cần hoạt động bình thường để hủy đơn khi user rời đi
 */
export function clearPaymentRedirectFlag(): void {
  sessionStorage.removeItem(PAYMENT_REDIRECT_FLAG_KEY);
  console.log('[AutoCancelOrder] Payment redirect flag CLEARED - auto-cancel enabled');
}

/**
 * Kiểm tra xem cờ Payment Gateway Handoff có đang bật không
 */
export function isPaymentRedirecting(): boolean {
  return sessionStorage.getItem(PAYMENT_REDIRECT_FLAG_KEY) === 'true';
}

// ==================== ROUTE GUARD UTILITIES ====================

/**
 * Xóa previous path trong sessionStorage
 * Gọi khi bắt đầu luồng booking mới để reset Route Guard state
 */
export function clearPreviousPath(): void {
  sessionStorage.removeItem(PREVIOUS_PATH_KEY);
  console.log('[RouteGuard] Previous path CLEARED');
}

/**
 * Lấy previous path từ sessionStorage (dùng cho debugging)
 */
export function getPreviousPath(): string | null {
  return sessionStorage.getItem(PREVIOUS_PATH_KEY);
}
