import { http } from './http';
import type { ApiResponse } from './user';

export interface Discount {
  id: number;
  code?: string | null;
  name: string;
  percent?: number | null;
  amount?: number | null;
  expiresAt?: string | null;
  createdAt?: string | null;
  status?: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | string;
}

export type GetDiscountsResponse = ApiResponse<Discount[]>;

const DiscountsAPI = {
  async getAll(status?: string): Promise<GetDiscountsResponse> {
    try {
      const params = status ? { status } : undefined;
      const res = await http.get('/api/discounts', { params });
      const raw = res.data;
      if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
        return raw as GetDiscountsResponse;
      }
      return { success: true, message: '', data: (raw as Discount[]) || [] } as GetDiscountsResponse;
    } catch (error: unknown) {
      let message = 'Unknown error';
      let data: Discount[] = [];
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error - axios error
        message = error.response?.data?.message || (error as Error).message || message;
        // @ts-expect-error - axios error
        data = error.response?.data?.data || [];
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data } as GetDiscountsResponse;
    }
  },

  async getById(id: number): Promise<ApiResponse<Discount>> {
    try {
      const res = await http.get(`/api/discounts/${id}`);
      const raw = res.data;
      if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
        return raw as ApiResponse<Discount>;
      }
      return { success: true, message: '', data: raw as Discount } as ApiResponse<Discount>;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error - axios error
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: null as unknown as Discount } as ApiResponse<Discount>;
    }
  },

  async create(payload: Partial<Discount>): Promise<ApiResponse<Discount>> {
    try {
      const res = await http.post('/api/discounts', payload, { headers: { 'Content-Type': 'application/json' } });
      const raw = res.data;
      if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
        return raw as ApiResponse<Discount>;
      }
      return { success: true, message: '', data: raw as Discount } as ApiResponse<Discount>;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error - axios error
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: null as unknown as Discount } as ApiResponse<Discount>;
    }
  },

  async update(id: number, payload: Partial<Discount>): Promise<ApiResponse<Discount>> {
    try {
      const res = await http.put(`/api/discounts/${id}`, payload, { headers: { 'Content-Type': 'application/json' } });
      const raw = res.data;
      if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
        return raw as ApiResponse<Discount>;
      }
      return { success: true, message: '', data: raw as Discount } as ApiResponse<Discount>;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error - axios error
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: null as unknown as Discount } as ApiResponse<Discount>;
    }
  },

  async delete(id: number): Promise<ApiResponse<null>> {
    try {
      const res = await http.delete(`/api/discounts/${id}`);
      const raw = res.data;
      if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
        return raw as ApiResponse<null>;
      }
      return { success: true, message: '', data: null } as ApiResponse<null>;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error - axios error
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: null } as ApiResponse<null>;
    }
  }
};

export default DiscountsAPI;
