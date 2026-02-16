import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import type { ApiResponse, TokenResponse } from "@staq/shared";

import {
  APIError,
  getAuthToken,
  getRefreshToken,
  setAuthToken,
  setRefreshToken,
  clearAllTokens,
} from "../utils";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    const apiResponse = response.data as ApiResponse<unknown>;
    if (apiResponse.error) {
      throw new APIError(
        apiResponse.error.code,
        apiResponse.error.message,
        response.status,
        apiResponse.error.details
      );
    }
    return response;
  },
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/api/v1/auth/refresh") &&
      !originalRequest.url?.includes("/api/v1/auth/login")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearAllTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(
          new APIError("UNAUTHORIZED", "No refresh token available", 401)
        );
      }

      try {
        const response = await axios.post<ApiResponse<TokenResponse>>(
          `${BASE_URL}/api/v1/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { "Content-Type": "application/json" } }
        );

        const tokenData = response.data.data;
        if (!tokenData) {
          throw new Error("Invalid refresh response");
        }

        setAuthToken(tokenData.access_token, tokenData.expires_in);
        setRefreshToken(tokenData.refresh_token);

        processQueue(null, tokenData.access_token);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${tokenData.access_token}`;
        }
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAllTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(
          new APIError("UNAUTHORIZED", "Session expired. Please login again.", 401)
        );
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.data?.error) {
      throw new APIError(
        error.response.data.error.code,
        error.response.data.error.message,
        error.response.status,
        error.response.data.error.details
      );
    }
    throw new APIError(
      "NETWORK_ERROR",
      error.message || "Network error occurred",
      error.response?.status || 0
    );
  }
);

export function extractData<T>(response: { data: ApiResponse<T> }): T {
  return response.data.data as T;
}
