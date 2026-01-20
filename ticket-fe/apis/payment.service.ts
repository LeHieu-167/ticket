import api from "@/config/axios.config";

// ==================== TYPES ====================

/**
 * Request tạo thanh toán VNPay
 */
export interface PaymentRequest {
  orderId: string;
  bankCode?: string; // Mã ngân hàng (nếu user chọn)
  language?: string; // "vn" hoặc "en"
}

/**
 * Response từ API tạo thanh toán
 */
export interface PaymentResponse {
  code: string;
  message: string;
  paymentUrl?: string;
}

/**
 * Response khi VNPay callback
 */
export interface PaymentCallbackResponse {
  success: boolean;
  responseCode: string;
  message: string;
  transactionId?: string;
  txnRef?: string;
  amount?: string;
  bankCode?: string;
  payDate?: string;
}

// ==================== PAYMENT SERVICE ====================

export const paymentService = {
  /**
   * Tạo URL thanh toán VNPay
   * Gọi API backend để lấy URL redirect đến VNPay
   * 
   * @param request Thông tin thanh toán
   * @returns PaymentResponse với paymentUrl
   */
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const response = await api.post<PaymentResponse>("/api/payment/create", request);
    return response.data;
  },

  /**
   * Map payment method từ UI sang bank code VNPay
   */
  mapMethodToBankCode(method: string): string | undefined {
    const mapping: Record<string, string | undefined> = {
      'momo': undefined, // MoMo không có bank code cụ thể
      'vnpay': undefined, // QR code chung
      'card': 'INTCARD', // Thẻ quốc tế
      'atm': 'VNBANK', // Thẻ ATM nội địa
    };
    return mapping[method];
  },

  /**
   * Redirect user đến VNPay để thanh toán
   */
  redirectToPayment(paymentUrl: string): void {
    window.location.href = paymentUrl;
  },

  /**
   * Parse kết quả callback từ URL search params
   */
  parseCallbackResult(searchParams: URLSearchParams): PaymentCallbackResponse | null {
    const responseCode = searchParams.get('vnp_ResponseCode');
    
    if (!responseCode) {
      return null;
    }

    return {
      success: responseCode === '00',
      responseCode,
      message: this.getResponseMessage(responseCode),
      transactionId: searchParams.get('vnp_TransactionNo') || undefined,
      txnRef: searchParams.get('vnp_TxnRef') || undefined,
      amount: searchParams.get('vnp_Amount') || undefined,
      bankCode: searchParams.get('vnp_BankCode') || undefined,
      payDate: searchParams.get('vnp_PayDate') || undefined,
    };
  },

  /**
   * Lấy message mô tả từ response code VNPay
   */
  getResponseMessage(responseCode: string): string {
    const messages: Record<string, string> = {
      '00': 'Giao dịch thành công',
      '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ.',
      '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking.',
      '10': 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.',
      '11': 'Đã hết hạn chờ thanh toán.',
      '12': 'Thẻ/Tài khoản bị khóa.',
      '13': 'Nhập sai mật khẩu xác thực (OTP).',
      '24': 'Khách hàng hủy giao dịch.',
      '51': 'Tài khoản không đủ số dư.',
      '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày.',
      '75': 'Ngân hàng thanh toán đang bảo trì.',
      '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định.',
    };
    return messages[responseCode] || 'Giao dịch thất bại';
  },

  /**
   * Kiểm tra trạng thái thanh toán của order
   * (Backup nếu không nhận được callback)
   */
  async checkPaymentStatus(orderId: string): Promise<{ status: string; message: string }> {
    try {
      const response = await api.get(`/api/payment/status/${orderId}`);
      return response.data;
    } catch {
      return { status: 'UNKNOWN', message: 'Không thể kiểm tra trạng thái' };
    }
  }
};

export default paymentService;

