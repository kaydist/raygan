import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import type { ApiResponse } from "@staq/shared";

import { APIError, getAuthToken } from "../utils";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

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
  (error: AxiosError<ApiResponse<unknown>>) => {
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
