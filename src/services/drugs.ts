import { http } from "./http";
import type { ApiResponse } from "./user";

export interface DrugItem {
  id: number;
  name: string;
  tag?: string;
  description?: string;
  quantity?: number;
  importedAt?: string; // YYYY-MM-DD
  expiryDate?: string; // YYYY-MM-DD
  status?: string;
  price?: number;
  priceUnit?: string;
}

export type GetDrugsResponse = ApiResponse<DrugItem[]>;

export const DrugAPI = {
  /**
   * Get list of drugs. If `tag` is provided it will be sent as query parameter /api/drugs?tag=...
   * Backend may return either ApiResponse<T> or a raw array; both are handled.
   */
  async getDrugs(tag?: string): Promise<GetDrugsResponse> {
    try {
      const res = await http.get('/api/drugs', { params: tag ? { tag } : undefined });
      const raw = res.data;
      if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
        return raw as GetDrugsResponse;
      }
      return { success: true, message: '', data: (raw as DrugItem[]) || [] } as GetDrugsResponse;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error axios error
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: [] } as GetDrugsResponse;
    }
  },

  /** Create a new drug record */
  async createDrug(payload: Partial<DrugItem>): Promise<ApiResponse<DrugItem>> {
    try {
      const res = await http.post('/api/drugs', payload, {
        headers: { 'Content-Type': 'application/json' }
      });
      const raw = res.data;
      // Normalize backend responses: some backends return ApiResponse<DrugItem>,
      // others return the created DrugItem directly.
      if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
        return raw as ApiResponse<DrugItem>;
      }
      return { success: true, message: '', data: (raw as DrugItem) } as ApiResponse<DrugItem>;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error axios error
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: null as unknown as DrugItem } as ApiResponse<DrugItem>;
    }
  }

  ,

  /** Delete a drug by id */
  async deleteDrug(id: number): Promise<ApiResponse<null>> {
    try {
      const res = await http.delete(`/api/drugs/${id}`);
      const raw = res.data;
      if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
        return raw as ApiResponse<null>;
      }
      // Some backends return { success: true } or the deleted id — normalize
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

  /** Update a drug record by id */
  async updateDrug(id: number, payload: Partial<DrugItem>): Promise<ApiResponse<DrugItem>> {
    try {
      const res = await http.put(`/api/drugs/${id}`, payload, {
        headers: { 'Content-Type': 'application/json' }
      });
      const raw = res.data;
      if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
        return raw as ApiResponse<DrugItem>;
      }
      return { success: true, message: '', data: (raw as DrugItem) } as ApiResponse<DrugItem>;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error axios error
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: null as unknown as DrugItem } as ApiResponse<DrugItem>;
    }
  }
};

export default DrugAPI;
