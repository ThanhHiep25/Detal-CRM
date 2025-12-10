import { http } from "./http";

export interface Dentist {
  id: number;
  name: string;
  userId: number;
  specialization: string;
  email: string;
  phone: string;
  active: boolean;
  bio: string;
  // optional fields returned by the API
  departmentId?: number;
  departmentName?: string;
  branchIds?: number[];
  branchNames?: string[];
}

export interface GetDentistsResponse {
  success: boolean;
  message: string;
  data: Dentist[];
}

export interface AddDentistPayload {
  name: string;
  userId: number;
  specialization: string;
  email: string;
  phone: string;
  active: boolean;
  bio: string;
  departmentId?: number;
  branchIds?: number[];
}

export interface AddDentistResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export type UpdateDentistPayload = AddDentistPayload;
export interface UpdateDentistResponse {
  success: boolean;
  message: string;
  data?: Dentist | unknown;
}

export interface DeleteDentistResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export const DentistAPI = {
  addDentist: async (payload: AddDentistPayload, accessToken?: string): Promise<AddDentistResponse> => {
    function getAccessTokenFromCookie(): string {
      const match = document.cookie.match(/(?:^|; )access_token=([^;]*)/);
      return match ? decodeURIComponent(match[1]) : '';
    }
    const token = accessToken || getAccessTokenFromCookie();
    try {
      const res = await http.post<AddDentistResponse>(
        "/api/dentists",
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );
      return res.data;
    } catch (error: unknown) {
      let message = "Unknown error";
      let data: unknown = undefined;
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error: may have response property
        message = error.response?.data?.message || (error as Error).message || message;
        // @ts-expect-error: may have response property
        data = error.response?.data;
      } else if (typeof error === "string") {
        message = error;
      }
      return {
        success: false,
        message,
        data
      };
    }
  },

  updateDentist: async (
    id: number,
    payload: UpdateDentistPayload,
    accessToken?: string
  ): Promise<UpdateDentistResponse> => {
    function getAccessTokenFromCookie(): string {
      const match = document.cookie.match(/(?:^|; )access_token=([^;]*)/);
      return match ? decodeURIComponent(match[1]) : '';
    }
    const token = accessToken || getAccessTokenFromCookie();
    try {
      const res = await http.put<UpdateDentistResponse>(
        `/api/dentists/${id}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );
      return res.data;
    } catch (error: unknown) {
      let message = "Unknown error";
      let data: unknown = undefined;
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error: may have response property
        message = error.response?.data?.message || (error as Error).message || message;
        // @ts-expect-error: may have response property
        data = error.response?.data;
      } else if (typeof error === "string") {
        message = error;
      }
      return { success: false, message, data };
    }
  },

  deleteDentist: async (
    id: number,
    accessToken?: string
  ): Promise<DeleteDentistResponse> => {
    function getAccessTokenFromCookie(): string {
      const match = document.cookie.match(/(?:^|; )access_token=([^;]*)/);
      return match ? decodeURIComponent(match[1]) : '';
    }
    const token = accessToken || getAccessTokenFromCookie();
    try {
      const res = await http.delete<DeleteDentistResponse>(
        `/api/dentists/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );
      return res.data;
    } catch (error: unknown) {
      let message = "Unknown error";
      let data: unknown = undefined;
      if (typeof error === "object" && error !== null) {
        // @ts-expect-error: may have response property
        message = error.response?.data?.message || (error as Error).message || message;
        // @ts-expect-error: may have response property
        data = error.response?.data;
      } else if (typeof error === "string") {
        message = error;
      }
      return { success: false, message, data };
    }
  },




  // Get dentists
  getDentists: async (): Promise<GetDentistsResponse> => {
    try {
      const res = await http.get<GetDentistsResponse>("/api/dentists/all");
      return res.data;
    } catch (error: unknown) {
      let message = "Unknown error";
      let data: Dentist[] = [];
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
        data
      };
    }
  }
};


