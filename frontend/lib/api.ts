import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { notifySessionExpired } from '@/lib/session';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

const authApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

type RetriableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh'];

const isAuthEndpoint = (url?: string) => AUTH_ENDPOINTS.some((endpoint) => url?.includes(endpoint));

const getAccessToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem('access_token');
};

const getRefreshToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem('refresh_token');
};

const clearStoredAuth = () => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const response = await authApi.post('/auth/refresh', refreshToken, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);
  }

  return response.data.access_token as string;
}

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config as RetriableConfig | undefined;

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthEndpoint(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (!newToken) {
        throw error;
      }

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearStoredAuth();
      notifySessionExpired('Your session has expired. Please sign in again.');
      return Promise.reject(refreshError);
    }
  }
);

export default api;
