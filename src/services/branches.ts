import { http } from "./http";

export interface Branch {
  id: number;
  name: string;
  code: string;
  address: string;
}

export interface GetBranchesResponse {
  success: boolean;
  message: string;
  data: Branch[];
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
};
