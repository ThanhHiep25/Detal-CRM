import { http } from "./http";

export interface Department {
  id: number;
  name: string;
  notes?: string;
}

export interface GetDepartmentsResponse {
  success: boolean;
  message: string;
  data: Department[];
}

function getAccessTokenFromCookie(): string {
  const match = document.cookie.match(/(?:^|; )access_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export const DepartmentAPI = {
  getDepartments: async (accessToken?: string): Promise<GetDepartmentsResponse> => {
    const token = accessToken || getAccessTokenFromCookie();
    try {
      const res = await http.get<Department[]>("/api/lookups/departments",{
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      return {
        success: true,
        message: "Fetched departments successfully",
        data: res.data,
      };
    } catch (error: unknown) {
      let message = "Unknown error";
      let data: Department[] = [];
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
};
