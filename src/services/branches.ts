import { http } from "./http";

export enum BranchStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export interface Branch {
  id: number;
  name: string;
  code?: string;
  address?: string;
  description?: string;
  status?: BranchStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface GetBranchesResponse {
  success: boolean;
  message: string;
  data: Branch[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

function getAccessTokenFromCookie(): string {
  const match = document.cookie.match(/(?:^|; )access_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export const BranchAPI = {
  getBranches: async (accessToken?: string): Promise<GetBranchesResponse> => {
    const token = accessToken || getAccessTokenFromCookie();
    try {
      const res = await http.get<Branch[]>("/api/branches", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      return {
        success: true,
        message: "Fetched branches successfully",
        data: res.data,
      };
    } catch (error: unknown) {
      let message = "Unknown error";
      let data: Branch[] = [];
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error: may have response property
        message = error.response?.data?.message || (error as Error).message || message;
        // @ts-expect-error: may have response property
        data = error.response?.data?.data || [];
      } else if (typeof error === "string") {
        message = error;
      }
      return {
        success: false,
        message,
        data,
      };
    }
  },
  getBranch: async (id: number, accessToken?: string): Promise<ApiResponse<Branch | null>> => {
    const token = accessToken || getAccessTokenFromCookie();
    try {
      const res = await http.get<Branch>(`/api/branches/${id}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      return { success: true, message: "Fetched branch", data: res.data };
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error: axios error may have response property
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") message = error;
      return { success: false, message, data: null };
    }
  },
  createBranch: async (payload: Partial<Branch>, accessToken?: string): Promise<ApiResponse<Branch | null>> => {
    const token = accessToken || getAccessTokenFromCookie();
    try {
      const res = await http.post<Branch>(`/api/branches`, payload, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      return { success: true, message: "Created branch", data: res.data };
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error: axios error may have response property
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") message = error;
      return { success: false, message, data: null };
    }
  },
  updateBranch: async (id: number, payload: Partial<Branch>, accessToken?: string): Promise<ApiResponse<Branch | null>> => {
    const token = accessToken || getAccessTokenFromCookie();
    try {
      const res = await http.put<Branch>(`/api/branches/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      return { success: true, message: "Updated branch", data: res.data };
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error: axios error may have response property
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") message = error;
      return { success: false, message, data: null };
    }
  },
  deleteBranch: async (id: number, accessToken?: string): Promise<ApiResponse<null>> => {
    const token = accessToken || getAccessTokenFromCookie();
    try {
      await http.delete(`/api/branches/${id}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      return { success: true, message: "Deleted branch", data: null };
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error: axios error may have response property
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") message = error;
      return { success: false, message, data: null };
    }
  },
  updateBranchStatus: async (id: number, status: BranchStatus, accessToken?: string): Promise<ApiResponse<Branch | null>> => {
    const token = accessToken || getAccessTokenFromCookie();
    try {
      const res = await http.patch<Branch>(`/api/branches/${id}/status?status=${status}`, null, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      return { success: true, message: "Updated status", data: res.data };
    } catch (error: unknown) {
      let message = "Unknown error";
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error: axios error may have response property
        message = error.response?.data?.message || (error as Error).message || message;
      } else if (typeof error === "string") message = error;
      return { success: false, message, data: null };
    }
  },
};
