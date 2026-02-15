import type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  AuthUser,
  AuthResponse,
  GoogleOAuthRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  RefreshTokenRequest,
} from "@staq/shared";

import { setAuthToken, clearAuthToken } from "../../utils";
import { axiosInstance, extractData } from "../client";

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await axiosInstance.post("/api/v1/auth/login", data);
    const result = extractData<AuthResponse>(response);
    setAuthToken(result.access_token, result.expires_in);
    return result;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await axiosInstance.post("/api/v1/auth/register", data);
    const result = extractData<AuthResponse>(response);
    setAuthToken(result.access_token, result.expires_in);
    return result;
  },

  googleOAuth: async (data: GoogleOAuthRequest): Promise<AuthResponse> => {
    const response = await axiosInstance.post("/api/v1/auth/google", data);
    const result = extractData<AuthResponse>(response);
    setAuthToken(result.access_token, result.expires_in);
    return result;
  },

  logout: async (): Promise<void> => {
    try {
      await axiosInstance.post("/api/v1/auth/logout");
    } finally {
      clearAuthToken();
    }
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<{ message: string }> => {
    const response = await axiosInstance.post("/api/v1/auth/forgot-password", data);
    return extractData(response);
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<{ message: string }> => {
    const response = await axiosInstance.post("/api/v1/auth/reset-password", data);
    return extractData(response);
  },

  refreshToken: async (data: RefreshTokenRequest): Promise<TokenResponse> => {
    const response = await axiosInstance.post("/api/v1/auth/refresh", data);
    const result = extractData<TokenResponse>(response);
    setAuthToken(result.access_token, result.expires_in);
    return result;
  },

  me: async (): Promise<AuthUser> => {
    const response = await axiosInstance.get("/api/v1/auth/me");
    return extractData(response);
  },
};
