import { http } from './http';

export interface ConsultationPayload {
  fullName: string;
  email: string;
  phone: string;
  method: string;
  content: string;
  customerId?: number;
  dentistId?: number;
  assistantId?: number;
  branchId?: number;
  serviceId?: number;
  scheduledDate?: string;
  scheduledTime?: string;
  durationMinutes?: number;
  notes?: string;
}

export interface ConsultationResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export const ConsultationAPI = {
  create: async (payload: ConsultationPayload): Promise<ConsultationResponse> => {
    try {
      const res = await http.post<ConsultationResponse>('/api/public/consultation', payload, { headers: { 'Content-Type': 'application/json' } });
      return res.data;
    } catch (err: unknown) {
      let message = 'Unknown error';
      if (typeof err === 'object' && err !== null) {
  // ignore typing for potential axios error shape
  // @ts-expect-error axios error shape may differ from Error
  message = err.response?.data?.message || (err as Error).message || message;
      } else if (typeof err === 'string') {
        message = err;
      }
      return { success: false, message };
    }
  }
};
