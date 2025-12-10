import { http } from './http';
import type { ApiResponse } from './user';

export interface RoleItem {
  id: number;
  name: string;
}

export const RoleAPI = {
  async getRoles(): Promise<ApiResponse<RoleItem[]>> {
    try {
      const res = await http.get('/api/roles');
      const raw = res.data;
      // backend may return raw array or wrapped ApiResponse
      if (raw && typeof raw === 'object' && 'success' in (raw as Record<string, unknown>)) {
        return raw as ApiResponse<RoleItem[]>;
      }
      return { success: true, message: '', data: (raw as RoleItem[]) || [] } as ApiResponse<RoleItem[]>;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error axios error
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: [] } as ApiResponse<RoleItem[]>;
    }
  }
};

export default RoleAPI;
