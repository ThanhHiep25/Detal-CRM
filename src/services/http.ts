import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";

// helper to read cookie by name (module scope so interceptors can reuse)
const getCookie = (name: string) => {
  try {
    const escaped = name.replace(/([.*+?^${}()|[\]\\])/g, '\\$1');
    const match = typeof document !== 'undefined' ? document.cookie.match(new RegExp('(^|; )' + escaped + '=([^;]*)')) : null;
    return match ? decodeURIComponent(match[2]) : null;
  } catch {
    return null;
  }
};

// Type for debugging log stored on window
interface HttpLog {
  request?: unknown;
  response?: unknown;
  error?: unknown;
}

// Extend Window interface for debugging
declare global {
  interface Window {
    __lastHttpLog?: HttpLog;
  }
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_NEXT_PUBLIC_API_BASE_URL|| "http://localhost:8080",
  withCredentials: true,
  timeout: 15000,
});

// Attach Authorization header from localStorage or cookies (supports access_token cookie)
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window === 'undefined') return config;

  const token = localStorage.getItem('accessToken') || getCookie('access_token') || getCookie('accessToken') || null;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
// Debugging: log outgoing requests and incoming responses to help trace why login may be failing
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  try {
    const method = config.method?.toUpperCase() || 'GET';
    // Log URL, method, params, and a short preview of body
    const info = {
      method,
      url: (config.baseURL || '') + (config.url || ''),
      params: config.params,
      data: config.data,
      headers: config.headers && {
        ...(config.headers.Authorization ? { Authorization: config.headers.Authorization } : {})
      },
      timestamp: Date.now(),
    };
    console.debug('[http] Request ->', info);
    try {
      if (typeof window !== 'undefined') {
        window.__lastHttpLog = { ...window.__lastHttpLog || {}, request: info };
      }
    } catch {
      // ignore logging errors
    }
  } catch {
    // ignore logging errors
  }
  return config;
});

let isRefreshing = false;
let refreshSubscribers: Array<(token?: string) => void> = [];
const subscribeTokenRefresh = (cb: (token?: string) => void) => refreshSubscribers.push(cb);
const onRefreshed = (token?: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

http.interceptors.response.use(
  (response: AxiosResponse) => {
    try {
      const info = {
        url: (response.config.baseURL || '') + (response.config.url || ''),
        status: response.status,
        data: response.data,
        timestamp: Date.now(),
      };
      console.debug('[http] Response <-', info);
      try {
        if (typeof window !== 'undefined') {
          window.__lastHttpLog = { ...window.__lastHttpLog || {}, response: info };
        }
      } catch {
        // ignore logging errors
      }
    } catch {
      // ignore logging errors
    }
    return response;
  },
  async (error: AxiosError) => {
    try {
      const resp = error?.response;
      const info = {
        url: resp?.config && ((resp.config.baseURL || '') + (resp.config.url || '')),
        status: resp?.status,
        data: resp?.data,
        message: error.message,
        timestamp: Date.now(),
      };
      console.error('[http] Response error <-', info);
      try {
        if (typeof window !== 'undefined') {
          window.__lastHttpLog = { ...window.__lastHttpLog || {}, error: info };
        }
      } catch {
        // ignore logging errors
      }

      // If 401, try refresh token flow and retry original request
      const originalRequest = resp?.config as InternalAxiosRequestConfig & { _retry?: boolean } | undefined;
      if (resp?.status === 401 && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;

        if (!isRefreshing) {
          isRefreshing = true;

          // Determine refresh token from storage or cookie
          const refreshToken = localStorage.getItem('refreshToken') || getCookie('refresh_token') || getCookie('refreshToken') || null;

          try {
            // Use axios directly to avoid interceptors recursion. Allow body or cookie-based refresh (backend handles 'auto').
            const refreshUrl = (http.defaults.baseURL || '') + '/api/auth/refresh?source=auto';
            const refreshResponse = await axios.post(refreshUrl, refreshToken ? { refreshToken } : undefined, { withCredentials: true });
            const payload = refreshResponse?.data;
            // backend may wrap data: { success, message, data: { accessToken, refreshToken } }
            const tokens = payload?.data || payload;
            const newAccess = tokens?.accessToken || tokens?.access_token || tokens?.accessToken;
            const newRefresh = tokens?.refreshToken || tokens?.refresh_token;

            if (newAccess) {
              try { localStorage.setItem('accessToken', newAccess); } catch {
                console.warn('Failed to save accessToken to localStorage');
              }
            }
            if (newRefresh) {
              try { localStorage.setItem('refreshToken', newRefresh); } catch {
                console.warn('Failed to save refreshToken to localStorage');
              }
            }

            onRefreshed(newAccess);
          } catch (refreshErr) {
            console.error('[http] Refresh token failed', refreshErr);
            onRefreshed(undefined);
          } finally {
            isRefreshing = false;
          }
        }

        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token?: string) => {
            if (token) {
              if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(http(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

    } catch (e) {
      // ignore and continue to reject original error
      console.error('[http] Error handling response error', e);
    }

    return Promise.reject(error);
  }
);

export default http;
