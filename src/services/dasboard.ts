import { http } from "./http";
import type { ApiResponse } from "./auth";

// Map of service name -> count
export type ServiceUsageMap = Record<string, number>;

export interface ByDentistEntry {
  dentistId: number;
  dentistName: string;
  totalAppointments: number;
  serviceCounts: Record<string, number>;
}

export type GetServiceUsageResponse = ApiResponse<ServiceUsageMap>;
export type GetUsageByDentistResponse = ApiResponse<ByDentistEntry[]>;

export const DashboardAPI = {
  async getServiceUsage(): Promise<GetServiceUsageResponse> {
    try {
      const res = await http.get<GetServiceUsageResponse>("/api/admin/services/service-usage");
      return res.data;
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error axios typing
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") {
        message = error;
      }
      return { success: false, message, data: {} } as GetServiceUsageResponse;
    }
  },

  async getUsageBetween(startIso: string, endIso: string): Promise<GetServiceUsageResponse> {
    try {
      const res = await http.get<GetServiceUsageResponse>("/api/admin/services/usage-between", {
        params: { start: startIso, end: endIso },
      });
      return res.data;
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error axios typing
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") {
        message = error;
      }
      return { success: false, message, data: {} } as GetServiceUsageResponse;
    }
  },

  async getUsageByRange(range: 'day' | 'month' | 'year', dateYmd: string): Promise<GetServiceUsageResponse> {
    try {
      const res = await http.get<GetServiceUsageResponse>("/api/admin/services/usage-by-range", {
        params: { range, date: dateYmd },
      });
      return res.data;
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error axios typing
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") {
        message = error;
      }
      return { success: false, message, data: {} } as GetServiceUsageResponse;
    }
  },

  async getUsageByDentist(startIso: string, endIso: string): Promise<GetUsageByDentistResponse> {
    try {
      const res = await http.get<GetUsageByDentistResponse>("/api/admin/services/by-dentist", {
        params: { start: startIso, end: endIso },
      });
      return res.data;
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error axios typing
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") {
        message = error;
      }
      return { success: false, message, data: [] } as GetUsageByDentistResponse;
    }
  },
};

export default DashboardAPI;
