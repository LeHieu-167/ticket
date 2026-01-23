"use client";

import { useEffect, useRef, useCallback, useState } from "react";

// ==================== TYPES ====================

/**
 * Notification từ server
 */
export interface NotificationMessage {
  type: "ORDER" | "PAYMENT" | "EVENT" | "SYSTEM" | "TICKET_CHECKIN";
  title: string;
  message: string;
  data: any;
  timestamp: string;
  severity: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
}

/**
 * Ticket check-in notification data
 */
export interface TicketCheckinData {
  ticketId: string;
  ticketCode: string;
  eventName: string;
  status: "USED";
  checkedInAt: string;
}

/**
 * Trạng thái kết nối WebSocket
 */
export type WebSocketStatus = "connecting" | "connected" | "disconnected" | "error";

/**
 * Options cho hook
 */
interface UseWebSocketOptions {
  /** URL WebSocket server */
  url?: string;
  /** User ID để subscribe user-specific queue */
  userId?: string | null;
  /** Tự động reconnect khi mất kết nối */
  autoReconnect?: boolean;
  /** Thời gian chờ reconnect (ms) */
  reconnectInterval?: number;
  /** Số lần reconnect tối đa */
  maxReconnectAttempts?: number;
  /** Callback khi nhận notification */
  onNotification?: (notification: NotificationMessage) => void;
  /** Callback khi vé được check-in */
  onTicketCheckedIn?: (data: TicketCheckinData) => void;
  /** Callback khi kết nối thay đổi */
  onConnectionChange?: (status: WebSocketStatus) => void;
}

// ==================== STOMP CLIENT IMPLEMENTATION ====================

/**
 * Simple STOMP client implementation
 * Không dùng external library để tránh dependency issues
 */
class SimpleStompClient {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, (message: any) => void> = new Map();
  private connected = false;
  private messageCounter = 0;

  constructor(
    private url: string,
    private onConnect: () => void,
    private onDisconnect: () => void,
    private onError: (error: Event) => void
  ) {}

  connect() {
    try {
      // Sử dụng SockJS-compatible URL
      const sockJsUrl = this.url.replace("/ws", "/ws/websocket");
      this.ws = new WebSocket(sockJsUrl);

      this.ws.onopen = () => {
        // Gửi CONNECT frame
        this.send("CONNECT\naccept-version:1.1,1.0\nheart-beat:10000,10000\n\n\0");
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.onDisconnect();
      };

      this.ws.onerror = (error) => {
        this.onError(error);
      };
    } catch (error) {
      console.error("WebSocket connection error:", error);
      this.onError(error as Event);
    }
  }

  private handleMessage(data: string) {
    // Parse STOMP frame
    if (data === "\n" || data === "\r\n") {
      // Heart-beat, ignore
      return;
    }

    const lines = data.split("\n");
    const command = lines[0];

    if (command === "CONNECTED") {
      this.connected = true;
      this.onConnect();
    } else if (command === "MESSAGE") {
      // Parse headers
      let destination = "";
      let bodyStart = 0;
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i] === "" || lines[i] === "\r") {
          bodyStart = i + 1;
          break;
        }
        const [key, value] = lines[i].split(":");
        if (key === "destination") {
          destination = value;
        }
      }

      // Parse body (remove null terminator)
      const body = lines.slice(bodyStart).join("\n").replace(/\0$/, "");

      // Find subscription and call handler
      this.subscriptions.forEach((handler, subDest) => {
        if (destination.includes(subDest) || subDest.includes(destination)) {
          try {
            const parsed = JSON.parse(body);
            handler(parsed);
          } catch (e) {
            handler(body);
          }
        }
      });
    }
  }

  subscribe(destination: string, handler: (message: any) => void): string {
    const id = `sub-${this.messageCounter++}`;
    this.subscriptions.set(destination, handler);
    
    if (this.connected) {
      this.send(`SUBSCRIBE\nid:${id}\ndestination:${destination}\n\n\0`);
    }
    
    return id;
  }

  unsubscribe(id: string) {
    this.send(`UNSUBSCRIBE\nid:${id}\n\n\0`);
  }

  private send(frame: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(frame);
    }
  }

  disconnect() {
    if (this.ws) {
      this.send("DISCONNECT\n\n\0");
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.subscriptions.clear();
  }

  isConnected() {
    return this.connected;
  }
}

// ==================== HOOK ====================

/**
 * Hook để kết nối WebSocket và nhận notifications realtime
 * 
 * @example
 * ```tsx
 * const { status, lastNotification } = useWebSocket({
 *   userId: user?.id,
 *   onTicketCheckedIn: (data) => {
 *     // Update ticket status in state
 *     setTickets(prev => prev.map(t => 
 *       t.id === data.ticketId ? { ...t, status: 'USED', checkedInAt: data.checkedInAt } : t
 *     ));
 *   }
 * });
 * ```
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws",
    userId,
    autoReconnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
    onNotification,
    onTicketCheckedIn,
    onConnectionChange,
  } = options;

  const [status, setStatus] = useState<WebSocketStatus>("disconnected");
  const [lastNotification, setLastNotification] = useState<NotificationMessage | null>(null);
  
  const clientRef = useRef<SimpleStompClient | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Update status and call callback
  const updateStatus = useCallback((newStatus: WebSocketStatus) => {
    if (!mountedRef.current) return;
    setStatus(newStatus);
    onConnectionChange?.(newStatus);
  }, [onConnectionChange]);

  // Handle notification
  const handleNotification = useCallback((notification: NotificationMessage) => {
    if (!mountedRef.current) return;
    
    console.log("📩 Received notification:", notification);
    setLastNotification(notification);
    onNotification?.(notification);

    // Handle specific notification types
    if (notification.type === "TICKET_CHECKIN" && notification.data) {
      onTicketCheckedIn?.(notification.data as TicketCheckinData);
    }
  }, [onNotification, onTicketCheckedIn]);

  // Reconnect logic
  const scheduleReconnect = useCallback(() => {
    if (!autoReconnect || !mountedRef.current) return;
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log("❌ Max reconnect attempts reached");
      updateStatus("error");
      return;
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        reconnectAttemptsRef.current++;
        console.log(`🔄 Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
        connect();
      }
    }, reconnectInterval);
  }, [autoReconnect, maxReconnectAttempts, reconnectInterval, updateStatus]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!userId) {
      console.log("⚠️ No userId provided, skipping WebSocket connection");
      return;
    }

    // Disconnect existing connection
    if (clientRef.current) {
      clientRef.current.disconnect();
    }

    updateStatus("connecting");

    clientRef.current = new SimpleStompClient(
      url,
      // onConnect
      () => {
        if (!mountedRef.current) return;
        
        console.log("✅ WebSocket connected");
        updateStatus("connected");
        reconnectAttemptsRef.current = 0;

        // Subscribe to user-specific notifications
        clientRef.current?.subscribe(
          `/user/${userId}/queue/notifications`,
          handleNotification
        );

        // Also subscribe to broadcast notifications
        clientRef.current?.subscribe(
          "/topic/notifications",
          handleNotification
        );
      },
      // onDisconnect
      () => {
        if (!mountedRef.current) return;
        console.log("🔌 WebSocket disconnected");
        updateStatus("disconnected");
        scheduleReconnect();
      },
      // onError
      (error) => {
        console.error("❌ WebSocket error:", error);
        updateStatus("error");
        scheduleReconnect();
      }
    );

    clientRef.current.connect();
  }, [userId, url, updateStatus, handleNotification, scheduleReconnect]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    
    updateStatus("disconnected");
  }, [updateStatus]);

  // Connect when userId changes
  useEffect(() => {
    mountedRef.current = true;

    if (userId) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    /** Trạng thái kết nối */
    status,
    /** Notification cuối cùng nhận được */
    lastNotification,
    /** Kết nối thủ công */
    connect,
    /** Ngắt kết nối */
    disconnect,
    /** Đang kết nối? */
    isConnected: status === "connected",
  };
}

export default useWebSocket;
