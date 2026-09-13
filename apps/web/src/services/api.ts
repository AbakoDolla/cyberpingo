import axios, { type AxiosInstance, AxiosError } from 'axios';

import { apiUrl } from '@/utils/env';
import { useAuthStore } from '@/store/auth.store';

/**
 * Centralised Axios client. Every service in `src/services` goes through it so
 * that the base URL, credentials and error handling stay in a single place.
 */
export const api: AxiosInstance = axios.create({
  baseURL: apiUrl,
  // Required for the HttpOnly refresh-token cookie issued by the API.
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearSession();
    }

    return Promise.reject(error);
  },
);

/** Message extractor that never leaks raw backend internals to the UI. */
export const getApiErrorMessage = (error: unknown, fallback = 'Something went wrong'): string => {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { error?: { message?: string } } | undefined;
    return body?.error?.message ?? fallback;
  }

  return fallback;
};
