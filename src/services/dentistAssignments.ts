import { http } from './http';

export interface DentistAssignment {
  id: number;
  dentistId: number | null;
  serviceId: number | null;
  branchId?: number | null;
  scheduleJson?: string | null;
  weekStart?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export const DentistAssignmentsAPI = {
  getAssignments: async (): Promise<ApiResponse<DentistAssignment[]>> => {
    try {
      const res = await http.get<ApiResponse<DentistAssignment[]>>('/api/dentist-assignments');
      return res.data;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error - axios-like error with response
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: [] };
    }
  },

  getAssignment: async (id: number): Promise<ApiResponse<DentistAssignment | null>> => {
    try {
      const res = await http.get<ApiResponse<DentistAssignment>>(`/api/dentist-assignments/${id}`);
      return res.data;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error - axios-like error with response
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: null };
    }
  },

  createAssignment: async (payload: Partial<DentistAssignment>): Promise<ApiResponse<DentistAssignment | null>> => {
    try {
      const res = await http.post<ApiResponse<DentistAssignment>>('/api/dentist-assignments', payload);
      return res.data;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error - axios-like error with response
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: null };
    }
  },

  updateAssignment: async (id: number, payload: Partial<DentistAssignment>): Promise<ApiResponse<DentistAssignment | null>> => {
    try {
      const res = await http.put<ApiResponse<DentistAssignment>>(`/api/dentist-assignments/${id}`, payload);
      return res.data;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error - axios-like error with response
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: null };
    }
  },

  deleteAssignment: async (id: number): Promise<ApiResponse<null>> => {
    try {
      const res = await http.delete<ApiResponse<null>>(`/api/dentist-assignments/${id}`);
      return res.data;
    } catch (error: unknown) {
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null) {
        // @ts-expect-error - axios-like error with response
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === 'string') {
        message = error;
      }
      return { success: false, message, data: null };
    }
  }
};
