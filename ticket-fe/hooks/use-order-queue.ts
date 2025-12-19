"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  orderService,
  OrderStatusResponse,
  QueueStatus,
} from "@/apis/order.service";

/**
 * Trạng thái của hook
 */
interface UseOrderQueueState {
  /** Trạng thái hiện tại của queue */
  status: QueueStatus | null;
  /** Thông báo từ server */
  message: string | null;
  /** Order ID nếu đã tạo thành công */
  orderId: number | null;
  /** Request ID hiện tại */
  requestId: string | null;
  /** Đang loading (gọi API) */
  isLoading: boolean;
  /** Có đang trong queue không */
  isInQueue: boolean;
  /** Có lỗi không */
  error: string | null;
}

/**
 * Kết quả trả về từ hook
 */
interface UseOrderQueueResult extends UseOrderQueueState {
  /** Đặt vé mới */
  placeOrder: (eventId: number, ticketQuantity: number) => Promise<void>;
  /** Hủy đơn hàng đang chờ */
  cancelOrder: () => Promise<void>;
  /** Kiểm tra trạng thái thủ công */
  refreshStatus: () => Promise<void>;
  /** Reset state về ban đầu */
  reset: () => void;
}

/**
 * Cấu hình cho hook
 */
interface UseOrderQueueOptions {
  /** Tự động polling khi đang trong queue (mặc định: true) */
  autoPolling?: boolean;
  /** Interval polling (ms) - mặc định: 3000ms */
  pollingInterval?: number;
  /** Callback khi đặt vé thành công */
  onSuccess?: (orderId: number) => void;
  /** Callback khi đặt vé thất bại */
  onFailed?: (message: string) => void;
  /** Callback khi có lỗi */
  onError?: (error: string) => void;
}

/**
 * Hook quản lý hàng chờ đặt vé (Resumable Queue)
 *
 * Features:
 * - Tự động khôi phục trạng thái sau khi reload trang
 * - Polling tự động khi đang trong queue
 * - Hỗ trợ callbacks cho các sự kiện
 *
 * @example
 * ```tsx
 * const {
 *   status,
 *   isLoading,
 *   isInQueue,
 *   placeOrder,
 *   cancelOrder
 * } = useOrderQueue({
 *   onSuccess: (orderId) => router.push(`/payment/${orderId}`),
 *   onFailed: (message) => toast.error(message)
 * });
 *
 * // Trong useEffect, hook sẽ tự động check pending order
 * // Khi user bấm mua vé:
 * await placeOrder(eventId, quantity);
 * ```
 */
export function useOrderQueue(
  options: UseOrderQueueOptions = {}
): UseOrderQueueResult {
  const {
    autoPolling = true,
    pollingInterval = 3000,
    onSuccess,
    onFailed,
    onError,
  } = options;

  // State
  const [state, setState] = useState<UseOrderQueueState>({
    status: null,
    message: null,
    orderId: null,
    requestId: null,
    isLoading: false,
    isInQueue: false,
    error: null,
  });

  // Refs để tránh stale closure
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Cập nhật state từ OrderStatusResponse
   */
  const updateStateFromResponse = useCallback(
    (response: OrderStatusResponse) => {
      if (!mountedRef.current) return;

      const isInQueue =
        response.status === "QUEUED" || response.status === "PROCESSING";

      setState((prev) => ({
        ...prev,
        status: response.status,
        message: response.message,
        orderId: response.orderId ?? null,
        requestId: response.requestId,
        isInQueue,
        error: null,
      }));

      // Trigger callbacks
      if (response.status === "SUCCESS" && response.orderId && onSuccess) {
        onSuccess(response.orderId);
      } else if (response.status === "FAILED" && onFailed) {
        onFailed(response.message || "Đặt vé thất bại");
      }
    },
    [onSuccess, onFailed]
  );

  /**
   * Bắt đầu polling
   */
  const startPolling = useCallback(
    (requestId: string) => {
      if (!autoPolling || pollingRef.current) return;

      console.log("🔄 Bắt đầu polling cho request:", requestId);

      pollingRef.current = setInterval(async () => {
        if (!mountedRef.current) {
          stopPolling();
          return;
        }

        try {
          const response = await orderService.checkOrderStatus(requestId);
          updateStateFromResponse(response);

          // Dừng polling nếu đã hoàn thành
          if (
            response.status === "SUCCESS" ||
            response.status === "FAILED" ||
            response.status === "NOT_FOUND"
          ) {
            stopPolling();
          }
        } catch (error) {
          console.error("Polling error:", error);
          // Không dừng polling khi có lỗi network, tiếp tục thử
        }
      }, pollingInterval);
    },
    [autoPolling, pollingInterval, updateStateFromResponse]
  );

  /**
   * Dừng polling
   */
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      console.log("⏹️ Dừng polling");
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // ==================== PUBLIC METHODS ====================

  /**
   * Đặt vé
   */
  const placeOrder = useCallback(
    async (eventId: number, ticketQuantity: number) => {
      if (!mountedRef.current) return;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await orderService.createOrder(
          eventId,
          ticketQuantity
        );
        updateStateFromResponse(response);

        // Bắt đầu polling nếu đang trong queue
        if (
          response.status === "QUEUED" ||
          response.status === "PROCESSING"
        ) {
          startPolling(response.requestId);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Có lỗi xảy ra";

        if (mountedRef.current) {
          setState((prev) => ({
            ...prev,
            error: errorMessage,
            isLoading: false,
          }));
        }

        if (onError) {
          onError(errorMessage);
        }
      } finally {
        if (mountedRef.current) {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      }
    },
    [updateStateFromResponse, startPolling, onError]
  );

  /**
   * Hủy đơn hàng đang chờ
   */
  const cancelOrder = useCallback(async () => {
    if (!state.requestId || !mountedRef.current) return;

    setState((prev) => ({ ...prev, isLoading: true }));
    stopPolling();

    try {
      await orderService.cancelQueuedOrder(state.requestId);

      if (mountedRef.current) {
        setState({
          status: null,
          message: "Đã hủy đơn hàng",
          orderId: null,
          requestId: null,
          isLoading: false,
          isInQueue: false,
          error: null,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Không thể hủy đơn hàng";

      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
        }));
      }
    }
  }, [state.requestId, stopPolling]);

  /**
   * Refresh status thủ công
   */
  const refreshStatus = useCallback(async () => {
    if (!state.requestId || !mountedRef.current) return;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await orderService.checkOrderStatus(state.requestId);
      updateStateFromResponse(response);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Không thể kiểm tra trạng thái";

      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
      }
    } finally {
      if (mountedRef.current) {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    }
  }, [state.requestId, updateStateFromResponse]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    stopPolling();
    orderService.clearPendingOrder();

    setState({
      status: null,
      message: null,
      orderId: null,
      requestId: null,
      isLoading: false,
      isInQueue: false,
      error: null,
    });
  }, [stopPolling]);

  // ==================== EFFECTS ====================

  /**
   * Khôi phục trạng thái khi mount (Resumable Queue)
   */
  useEffect(() => {
    mountedRef.current = true;

    const resumeOrder = async () => {
      const pendingRequest = orderService.getPendingOrderRequest();

      if (!pendingRequest) return;

      console.log("🔄 Phát hiện pending order, đang khôi phục...");

      setState((prev) => ({
        ...prev,
        requestId: pendingRequest.requestId,
        isLoading: true,
      }));

      try {
        const response = await orderService.resumeOrder();

        if (response && mountedRef.current) {
          updateStateFromResponse(response);

          // Bắt đầu polling nếu vẫn đang trong queue
          if (
            response.status === "QUEUED" ||
            response.status === "PROCESSING"
          ) {
            startPolling(response.requestId);
          }
        }
      } catch (error) {
        console.error("Resume order error:", error);
      } finally {
        if (mountedRef.current) {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      }
    };

    resumeOrder();

    // Cleanup
    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [updateStateFromResponse, startPolling, stopPolling]);

  return {
    ...state,
    placeOrder,
    cancelOrder,
    refreshStatus,
    reset,
  };
}

export default useOrderQueue;

