import { http } from './http';
import type { AppointmentItem } from './appointments';
import type { Prescription } from './prescription';

export interface CreateVNPayPayload {
  // appointmentId is optional to support payments that are only for a prescription
  appointmentId?: number;
  amount: number;
  prescriptionId?: number;
  // optional frontend redirect URL after VNPay callback (backend may use to redirect user)
  redirectUrl?: string;
}

export interface CreateCashPayload {
  // optional appointmentId; at least one of appointmentId or prescriptionId should be provided by caller
  appointmentId?: number;
  amount: number;
  prescriptionId?: number;
}

export interface CreateVNPayResponse {
  paymentUrl?: string;
  paymentId?: number;
  transactionId?: string;
  success?: boolean;
  message?: string;
}

export interface Transaction {
  id?: number;
  paymentId?: number;
  transactionId?: string;
  transactionNo?: string;
  amount?: number;
  paymentDate?: string;
  transactionTime?: string;
  bankCode?: string;
  paymentMethod?: string;
  status?: string;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
  appointment?: AppointmentItem | null;
  prescription?: Prescription | null;
  appointmentId?: number;
  prescriptionId?: number;
}

export const PaymentAPI = {
  async createVnPay(payload: CreateVNPayPayload): Promise<CreateVNPayResponse> {
    try {
      const res = await http.post('/api/payments/vnpay', payload, { headers: { 'Content-Type': 'application/json' } });
      const raw = res.data;
      if (raw && typeof raw === 'object') {
        return raw as CreateVNPayResponse;
      }
      return { paymentUrl: String(raw) } as CreateVNPayResponse;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error axios response
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message } as CreateVNPayResponse;
    }
  }

  ,
  async createCash(payload: CreateCashPayload): Promise<CreateVNPayResponse> {
    try {
      const res = await http.post('/api/payments/cash', payload, { headers: { 'Content-Type': 'application/json' } });
      const raw = res.data;
      if (raw && typeof raw === 'object') return raw as CreateVNPayResponse;
      return { success: true } as CreateVNPayResponse;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error axios response
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message } as CreateVNPayResponse;
    }
  }

  ,
  async getAllTransactions(): Promise<Transaction[]> {
    try {
      const res = await http.get('/api/payments/vnpay/transactions');
      const raw = res.data;
      // support wrapped responses { success, data } or direct array
      if (raw && typeof raw === 'object' && 'data' in raw) return (raw.data as Transaction[]) || [];
      return (raw as Transaction[]) || [];
    } catch {
      return [];
    }
  }

  ,
  async getTransactionById(id: number): Promise<Transaction | { success: false; message: string }> {
    try {
      const res = await http.get(`/api/payments/vnpay/transaction/${id}`);
      const raw = res.data;
      if (raw && typeof raw === 'object' && 'data' in raw) return raw.data as Transaction;
      return raw as Transaction;
    } catch {
      return { success: false, message: 'Not found' };
    }
  }

  ,
  async getTotalAmount(): Promise<string> {
    try {
      const res = await http.get('/api/payments/amount/total');
      return res.data;
    } catch {
      return '0';
    }
  }

  ,
  async getRevenueMonthly(): Promise<unknown[]> {
    try {
      const res = await http.get('/api/payments/revenue/monthly');
      return (res.data as unknown[]) || [];
    } catch {
      return [];
    }
  }

  ,
  async getMonthlyRevenueAllTime(params: { year?: number; month?: number; day?: number } = {}): Promise<unknown> {
    try {
      const res = await http.get('/api/payments/monthly-revenue-all-time', { params });
      return res.data;
    } catch {
      return [];
    }
  }

  ,
  async countSuccessfulPayments(params: { year?: number; month?: number; day?: number } = {}): Promise<number> {
    try {
      const res = await http.get('/api/payments/count-successful-payments', { params });
      return Number(res.data || 0);
    } catch {
      return 0;
    }
  }

  ,
  async sumAmountSuccessfulPayments(params: { year?: number; month?: number; day?: number } = {}): Promise<number | unknown> {
    try {
      const res = await http.get('/api/payments/sum-amount-successful-payments', { params });
      return res.data;
    } catch {
      return 0;
    }
  }
};

export default PaymentAPI;
