import { http } from "./http";
import type { ApiResponse } from "./auth";

export interface ServiceItem {
  id: number;
  name: string;
  price: number;
  description: string;
  durationMinutes: number;
}

export type GetServicesResponse = ApiResponse<ServiceItem[]>;
export type ServicePayload = Pick<ServiceItem, 'name' | 'price' | 'description' | 'durationMinutes'>;

export const ServiceAPI = {
  async getServices(): Promise<GetServicesResponse> {
    try {
      const res = await http.get<GetServicesResponse>("/api/services");
      return res.data;
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error axios error typing
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") {
        message = error;
      }
      return { success: false, message, data: [] } as GetServicesResponse;
    }
  },
  async deleteService(id: number): Promise<ApiResponse<unknown>> {
    try {
      const res = await http.delete<ApiResponse<unknown>>(`/api/services/${id}`);
      return res.data;
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
  async createService(payload: ServicePayload): Promise<ApiResponse<ServiceItem>> {
    try {
      const res = await http.post<ApiResponse<ServiceItem>>(`/api/services`, payload);
      return res.data;
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error axios error typing
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") {
        message = error;
      }
      return { success: false, message, data: null as unknown as ServiceItem } as ApiResponse<ServiceItem>;
    }
  },
  async updateService(id: number, payload: ServicePayload): Promise<ApiResponse<ServiceItem>> {
    try {
      const res = await http.put<ApiResponse<ServiceItem>>(`/api/services/${id}`, payload);
      return res.data;
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error axios error typing
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") {
        message = error;
      }
      return { success: false, message, data: null as unknown as ServiceItem } as ApiResponse<ServiceItem>;
    }
  }
};
