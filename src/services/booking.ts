import { http } from './http';

export interface QuickBookingPayload {
  fullName: string;
  email: string;
  phone: string;
  serviceId: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  dentistId?: number;
  notes?: string;
}

export interface QuickBookingResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export const QuickBookingAPI = {
  create: async (payload: QuickBookingPayload): Promise<QuickBookingResponse> => {
    try {
      const res = await http.post<QuickBookingResponse>('/api/public/quick-booking', payload, { headers: { 'Content-Type': 'application/json' } });
      return res.data;
    } catch (err: unknown) {
      let message = 'Unknown error';
      if (typeof err === 'object' && err !== null) {
        // @ts-expect-error axios error shape may differ
        message = err.response?.data?.message || (err as Error).message || message;
      } else if (typeof err === 'string') {
        message = err;
      }
      return { success: false, message };
    }
  }
};
