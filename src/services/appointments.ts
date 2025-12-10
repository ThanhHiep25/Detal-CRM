import { http } from "./http";
import type { ApiResponse } from "./user";

export interface CreateAppointmentPayload {
  customerId?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  dentistRefId: number;
  receptionistId?: number | null;
  assistantId?: number | null;
  branchId?: number | null;
  serviceId: number;
  estimatedMinutes: number;
  scheduledTime: string; // ISO string
  scheduledLocal?: string; // optional local representation, e.g. "YYYY-MM-DD HH:mm"
  notes?: string;
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | string;
}

export interface AppointmentItem {
  id: number;
  label?: string;
  customerId?: number;
  customerUsername?: string;
  customerEmail?: string;
  customerName?: string | null;
  serviceId?: number;
  serviceName?: string;
  serviceDuration?: number | null;
  dentistId?: number;
  dentistRefId?: number;
  dentistName?: string;
  dentistUserId?: number;
  assistantId?: number;
  assistantUserId?: number;
  assistantName?: string;
  branchId?: number;
  branchName?: string;
  branchAddress?: string;
  scheduledTime?: string;
  estimatedMinutes?: number | null;
  notes?: string;
  status?: string;
  receptionistId?: number;
  receptionistUsername?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const AppointmentAPI = {
  async create(payload: CreateAppointmentPayload): Promise<ApiResponse<unknown>> {
    try {
      const res = await http.post<ApiResponse<unknown>>('/api/appointments', payload, {
        headers: { 'Content-Type': 'application/json' }
      });
      return res.data;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error may have response
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: null } as ApiResponse<unknown>;
    }
  }
  ,
  async getAll(): Promise<ApiResponse<AppointmentItem[]>> {
    try {
      const axiosRes = await http.get('/api/appointments');
      const raw = axiosRes.data;
      // If backend already returns ApiResponse<T>, return it as-is
      if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
        return raw as ApiResponse<AppointmentItem[]>;
      }
      // Otherwise server returned raw array -> wrap into ApiResponse
      return { success: true, message: '', data: (raw as AppointmentItem[]) || [] } as ApiResponse<AppointmentItem[]>;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error may have response
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: [] } as ApiResponse<AppointmentItem[]>;
    }
  }
  ,
  async getDaySchedule(dentistId: number, date: string): Promise<ApiResponse<unknown>> {
    try {
      const res = await http.get(`/api/appointments/dentist/${dentistId}/day`, { params: { date } });
      return res.data;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error may have response
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: null } as ApiResponse<unknown>;
    }
  }
  ,
  async update(id: number, payload: Partial<AppointmentItem>): Promise<ApiResponse<AppointmentItem>> {
    try {
      // Use PATCH to partially update the appointment resource
      const res = await http.patch<ApiResponse<AppointmentItem>>(`/api/appointments/${id}`, payload, {
        headers: { 'Content-Type': 'application/json' }
      });
      return res.data;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error may have response
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: null as unknown as AppointmentItem } as ApiResponse<AppointmentItem>;
    }
  },
  async setStatus(id: number, status: string): Promise<ApiResponse<unknown>> {
    try {
      // backend endpoint: /api/appointments/{id}/status/{status}
      // Use PATCH to update status on the resource
      const res = await http.patch<ApiResponse<unknown>>(`/api/appointments/${id}/status/${status}`);
      return res.data;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error may have response
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: null } as ApiResponse<unknown>;
    }
  },
  async cancel(id: number): Promise<ApiResponse<unknown>> {
    try {
      const res = await http.delete<ApiResponse<unknown>>(`/api/appointments/${id}`);
      return res.data;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error may have response
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: null } as ApiResponse<unknown>;
    }
  }
  ,
  /**
   * Send a reminder for an appointment.
   * POST /api/appointments/{id}/remind?html=true
   * Example payload: { to: string, message?: string }
   */
  async remind(id: number, payload: { to: string; message?: string }, html = true): Promise<ApiResponse<unknown>> {
    try {
      const axiosRes = await http.post(`/api/appointments/${id}/remind`, payload, { params: { html: html ? 'true' : 'false' } });
      const raw = axiosRes.data;
      if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
        return raw as ApiResponse<unknown>;
      }
      return { success: true, message: '', data: raw } as ApiResponse<unknown>;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error may have response
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: null } as ApiResponse<unknown>;
    }
  }
};
