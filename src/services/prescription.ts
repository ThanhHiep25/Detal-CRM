import { http } from './http';
import type { ApiResponse } from './user';

export interface PrescriptionDrug {
  id?: number;
  drugId: number;
  drugName?: string;
  quantity: number;
  note?: string;
}

export interface Prescription {
  id: number;
  appointmentId: number;
  patientId: number;
  patientName: string;
  patientEmail?: string;
  doctorId: number;
  doctorUserId?: number;
  doctorName?: string;
  doctorEmail?: string;
  content?: string;
  createdAt?: string;
  note?: string;
  drugs: PrescriptionDrug[];
  // new financial fields
  totalAmount?: number;
  discountAmount?: number;
  discountPercent?: number;
  discountId?: number;
  discountCode?: string;
  finalAmount?: number;
}

export type GetPrescriptionsResponse = ApiResponse<Prescription[]>;

export const PrescriptionAPI = {
  async create(payload: Partial<Prescription>): Promise<ApiResponse<Prescription>> {
    try {
      const res = await http.post('/api/prescriptions', payload, { headers: { 'Content-Type': 'application/json' } });
      const raw = res.data;
      if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
        return raw as ApiResponse<Prescription>;
      }
      return { success: true, message: '', data: raw as Prescription } as ApiResponse<Prescription>;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
  // @ts-expect-error - axios error
  message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: null as unknown as Prescription } as ApiResponse<Prescription>;
    }
  },

  async update(id: number, payload: Partial<Prescription>): Promise<ApiResponse<Prescription>> {
    try {
      const res = await http.put(`/api/prescriptions/${id}`, payload, { headers: { 'Content-Type': 'application/json' } });
      const raw = res.data;
      if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
        return raw as ApiResponse<Prescription>;
      }
      return { success: true, message: '', data: raw as Prescription } as ApiResponse<Prescription>;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
  // @ts-expect-error - axios error
  message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: null as unknown as Prescription } as ApiResponse<Prescription>;
    }
  },

  async delete(id: number): Promise<ApiResponse<null>> {
    try {
      const res = await http.delete(`/api/prescriptions/${id}`);
      const raw = res.data;
      if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
        return raw as ApiResponse<null>;
      }
      return { success: true, message: '', data: null } as ApiResponse<null>;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error axios error
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: null } as ApiResponse<null>;
    }
  },

  async getAll(): Promise<GetPrescriptionsResponse> {
    try {
      const res = await http.get('/api/prescriptions');
      const raw = res.data;
      if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
        return raw as GetPrescriptionsResponse;
      }
      return { success: true, message: '', data: (raw as Prescription[]) || [] } as GetPrescriptionsResponse;
    } catch (error: unknown) {
      let message = 'Unknown error';
      let data: Prescription[] = [];
      if (typeof error === 'object' && error !== null) {
  // @ts-expect-error - axios error
  message = error.response?.data?.message || (error as Error).message || message;
  // @ts-expect-error - axios error
  data = error.response?.data?.data || [];
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data } as GetPrescriptionsResponse;
    }
  },

  async getById(id: number): Promise<ApiResponse<Prescription>> {
    try {
      const res = await http.get(`/api/prescriptions/${id}`);
      const raw = res.data;
      if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
        return raw as ApiResponse<Prescription>;
      }
      return { success: true, message: '', data: raw as Prescription } as ApiResponse<Prescription>;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error axios error
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: null as unknown as Prescription } as ApiResponse<Prescription>;
    }
  }
};

export default PrescriptionAPI;
