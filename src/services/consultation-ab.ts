import { http } from "./http";
import type { ApiResponse } from "./auth";

export interface ConsultationBrief {
  id: number | null;
  fullName?: string;
  email?: string;
  avatarUrl?: string;
  phone?: string;
  name?: string;
  specialization?: string;
  address?: string;
  price?: number;
}

export type ConsultationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface ConsultationItem {
  id: number;
  customerId: number | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  dentistId: number | null;
  assistantId: number | null;
  branchId: number | null;
  serviceId: number | null;
  scheduledTime: string | null;
  durationMinutes: number | null;
  notes: string | null;
  status?: ConsultationStatus;
  createdAt: string;
  updatedAt: string;
  // nested brief objects
  customer?: ConsultationBrief | null;
  dentist?: ConsultationBrief | null;
  assistant?: ConsultationBrief | null;
  branch?: ConsultationBrief | null;
  service?: ConsultationBrief | null;
}

export interface ConsultationPayload {
  customerId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  dentistId?: number | null;
  assistantId?: number | null;
  branchId?: number | null;
  serviceId?: number | null;
  scheduledTime: string | null;
  durationMinutes: number | null;
  notes?: string | null;
  status?: ConsultationStatus;
}

export const ConsultationAPI = {
  // Create consultation
  async create(payload: ConsultationPayload): Promise<ApiResponse<ConsultationItem>> {
    try {
      const res = await http.post("/api/consultations", payload);
      const rawData = res.data;
      
      // Check if response is already wrapped in ApiResponse format
      if (rawData && typeof rawData === 'object' && 'success' in rawData && 'data' in rawData) {
        return rawData as ApiResponse<ConsultationItem>;
      }
      
      // If response is direct object, wrap it in ApiResponse format
      if (rawData && typeof rawData === 'object') {
        return { success: true, message: 'Success', data: rawData as ConsultationItem };
      }
      
      return { success: false, message: 'Invalid response format', data: null as unknown as ConsultationItem };
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error axios error typing
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") {
        message = error;
      }
      return { success: false, message, data: null as unknown as ConsultationItem } as ApiResponse<ConsultationItem>;
    }
  },

  // Get all consultations
  async getAll(): Promise<ApiResponse<ConsultationItem[]>> {
    try {
      const res = await http.get("/api/consultations");
      const rawData = res.data;
      
      // Check if response is already wrapped in ApiResponse format
      if (rawData && typeof rawData === 'object' && 'success' in rawData && 'data' in rawData) {
        return rawData as ApiResponse<ConsultationItem[]>;
      }
      
      // If response is direct array, wrap it in ApiResponse format
      if (Array.isArray(rawData)) {
        return { success: true, message: 'Success', data: rawData as ConsultationItem[] };
      }
      
      return { success: false, message: 'Invalid response format', data: [] };
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error axios error typing
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") {
        message = error;
      }
      return { success: false, message, data: [] } as ApiResponse<ConsultationItem[]>;
    }
  },

  // Get consultation by id
  async getById(id: number): Promise<ApiResponse<ConsultationItem>> {
    try {
      const res = await http.get<ApiResponse<ConsultationItem>>(`/api/consultations/${id}`);
      return res.data;
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error axios error typing
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") {
        message = error;
      }
      return { success: false, message, data: null as unknown as ConsultationItem } as ApiResponse<ConsultationItem>;
    }
  },

  // Get consultations by customer
  async getByCustomer(customerId: number): Promise<ApiResponse<ConsultationItem[]>> {
    try {
      const res = await http.get<ApiResponse<ConsultationItem[]>>(`/api/consultations/by-customer/${customerId}`);
      return res.data;
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error axios error typing
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") {
        message = error;
      }
      return { success: false, message, data: [] } as ApiResponse<ConsultationItem[]>;
    }
  },

  // Get consultations by dentist
  async getByDentist(dentistId: number): Promise<ApiResponse<ConsultationItem[]>> {
    try {
      const res = await http.get<ApiResponse<ConsultationItem[]>>(`/api/consultations/by-dentist/${dentistId}`);
      return res.data;
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error axios error typing
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") {
        message = error;
      }
      return { success: false, message, data: [] } as ApiResponse<ConsultationItem[]>;
    }
  },

  // Update consultation
  async update(id: number, payload: Partial<ConsultationPayload>): Promise<ApiResponse<ConsultationItem>> {
    try {
      const res = await http.put(`/api/consultations/${id}`, payload);
      const rawData = res.data;
      
      // Check if response is already wrapped in ApiResponse format
      if (rawData && typeof rawData === 'object' && 'success' in rawData && 'data' in rawData) {
        return rawData as ApiResponse<ConsultationItem>;
      }
      
      // If response is direct object, wrap it in ApiResponse format
      if (rawData && typeof rawData === 'object') {
        return { success: true, message: 'Cập nhật thành công', data: rawData as ConsultationItem };
      }
      
      return { success: false, message: 'Invalid response format', data: null as unknown as ConsultationItem };
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error axios error typing
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") {
        message = error;
      }
      return { success: false, message, data: null as unknown as ConsultationItem } as ApiResponse<ConsultationItem>;
    }
  },

  // Delete consultation
  async delete(id: number): Promise<ApiResponse<unknown>> {
    try {
      const res = await http.delete(`/api/consultations/${id}`);
      const rawData = res.data;
      
      // Check if response is already wrapped in ApiResponse format
      if (rawData && typeof rawData === 'object' && 'success' in rawData) {
        return rawData as ApiResponse<unknown>;
      }
      
      // If response is successful (204 No Content or any successful status)
      if (res.status >= 200 && res.status < 300) {
        return { success: true, message: 'Xóa thành công', data: rawData };
      }
      
      return { success: false, message: 'Invalid response format', data: null };
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error axios error typing
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") {
        message = error;
      }
      return { success: false, message, data: null } as ApiResponse<unknown>;
    }
  },

  // Change status to CONFIRMED
  async confirm(id: number): Promise<ApiResponse<ConsultationItem>> {
    try {
      const res = await http.put(`/api/consultations/${id}/confirm`);
      const rawData = res.data;
      
      if (rawData && typeof rawData === 'object' && 'success' in rawData && 'data' in rawData) {
        return rawData as ApiResponse<ConsultationItem>;
      }
      
      if (rawData && typeof rawData === 'object') {
        return { success: true, message: 'Xác nhận thành công', data: rawData as ConsultationItem };
      }
      
      return { success: false, message: 'Invalid response format', data: null as unknown as ConsultationItem };
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error axios error typing
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") {
        message = error;
      }
      return { success: false, message, data: null as unknown as ConsultationItem } as ApiResponse<ConsultationItem>;
    }
  },

  // Change status to CANCELLED
  async cancel(id: number): Promise<ApiResponse<ConsultationItem>> {
    try {
      const res = await http.put(`/api/consultations/${id}/cancel`);
      const rawData = res.data;
      
      if (rawData && typeof rawData === 'object' && 'success' in rawData && 'data' in rawData) {
        return rawData as ApiResponse<ConsultationItem>;
      }
      
      if (rawData && typeof rawData === 'object') {
        return { success: true, message: 'Hủy thành công', data: rawData as ConsultationItem };
      }
      
      return { success: false, message: 'Invalid response format', data: null as unknown as ConsultationItem };
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error axios error typing
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") {
        message = error;
      }
      return { success: false, message, data: null as unknown as ConsultationItem } as ApiResponse<ConsultationItem>;
    }
  },

  // Change status to COMPLETED
  async complete(id: number): Promise<ApiResponse<ConsultationItem>> {
    try {
      const res = await http.put(`/api/consultations/${id}/complete`);
      const rawData = res.data;
      
      if (rawData && typeof rawData === 'object' && 'success' in rawData && 'data' in rawData) {
        return rawData as ApiResponse<ConsultationItem>;
      }
      
      if (rawData && typeof rawData === 'object') {
        return { success: true, message: 'Hoàn thành thành công', data: rawData as ConsultationItem };
      }
      
      return { success: false, message: 'Invalid response format', data: null as unknown as ConsultationItem };
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error axios error typing
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") {
        message = error;
      }
      return { success: false, message, data: null as unknown as ConsultationItem } as ApiResponse<ConsultationItem>;
    }
  },

  // Change status to PENDING
  async pending(id: number): Promise<ApiResponse<ConsultationItem>> {
    try {
      const res = await http.put(`/api/consultations/${id}/pending`);
      const rawData = res.data;
      
      if (rawData && typeof rawData === 'object' && 'success' in rawData && 'data' in rawData) {
        return rawData as ApiResponse<ConsultationItem>;
      }
      
      if (rawData && typeof rawData === 'object') {
        return { success: true, message: 'Đặt lại thành công', data: rawData as ConsultationItem };
      }
      
      return { success: false, message: 'Invalid response format', data: null as unknown as ConsultationItem };
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error axios error typing
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") {
        message = error;
      }
      return { success: false, message, data: null as unknown as ConsultationItem } as ApiResponse<ConsultationItem>;
    }
  },

  // Generic status setter
  async setStatus(id: number, status: ConsultationStatus): Promise<ApiResponse<ConsultationItem>> {
    try {
      const res = await http.put(`/api/consultations/${id}/status?status=${status}`);
      const rawData = res.data;
      
      if (rawData && typeof rawData === 'object' && 'success' in rawData && 'data' in rawData) {
        return rawData as ApiResponse<ConsultationItem>;
      }
      
      if (rawData && typeof rawData === 'object') {
        return { success: true, message: 'Cập nhật trạng thái thành công', data: rawData as ConsultationItem };
      }
      
      return { success: false, message: 'Invalid response format', data: null as unknown as ConsultationItem };
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error axios error typing
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") {
        message = error;
      }
      return { success: false, message, data: null as unknown as ConsultationItem } as ApiResponse<ConsultationItem>;
    }
  },
};
